import { supabase } from "./supabase";
import { uuid } from "./uuid";

// All planner reads and writes go through here. Every table is protected by
// Row Level Security, so each query only ever sees the signed-in user's rows.

const check = ({ error }) => {
  if (error) throw new Error(error.message);
};

// ---------------------------------------------------------------- habit months

// A habit lasts one month: the month its week's Monday falls in ("2026-11-03" -> "2026-11-01").
export const monthOfWeek = (weekKey) => `${weekKey.slice(0, 8)}01`;

const nextMonthKey = (monthKey) => {
  const [y, m] = monthKey.split("-").map(Number);
  return `${m === 12 ? y + 1 : y}-${String((m % 12) + 1).padStart(2, "0")}-01`;
};

// Before the habit_renewals migration is applied the table doesn't exist. Habits then keep
// carrying over as they used to, rather than the whole planner failing to load.
const missingTable = (error) => error.code === "PGRST205" || error.code === "42P01";

/** This month's answers as Map<habit text, continued>, or null when renewals aren't set up. */
export const listRenewals = async (monthKey) => {
  const { data, error } = await supabase
    .from("habit_renewals")
    .select("text, continued")
    .eq("month_start", monthKey);
  if (error) {
    if (missingTable(error)) return null;
    throw new Error(error.message);
  }
  return new Map(data.map((r) => [r.text, r.continued]));
};

// The latest earlier week that had habits written on it.
const latestHabitWeek = async (before) => {
  const { data, error } = await supabase
    .from("weeks")
    .select("week_start, week_tasks(position, text)")
    .lt("week_start", before)
    .order("week_start", { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return data.find((w) => w.week_tasks.some((t) => t.text.trim())) ?? null;
};

const habitNames = (week) => [
  ...new Set(
    week.week_tasks
      .filter((t) => t.text.trim())
      .sort((a, b) => a.position - b.position)
      .map((t) => t.text.trim()),
  ),
];

/**
 * The habit names (never the check marks) from the latest earlier week that had any.
 * Within a month they all carry over; into a new month only the ones continued for it.
 */
export const carriedHabits = async (weekStart) => {
  const prev = await latestHabitWeek(weekStart);
  if (!prev) return [];
  let keep = () => true;
  const month = monthOfWeek(weekStart);
  if (monthOfWeek(prev.week_start) !== month) {
    const renewals = await listRenewals(month);
    if (renewals) keep = (t) => renewals.get(t.text.trim()) === true;
  }
  return prev.week_tasks
    .filter((t) => t.text.trim() && keep(t))
    .sort((a, b) => a.position - b.position)
    .map((t) => ({ id: uuid(), position: t.position, text: t.text, days: Array(7).fill(false) }));
};

/**
 * Last month's habits still waiting for an answer in the month of `weekStart`. A habit that was
 * written into this month's weeks again by hand counts as continued and isn't asked about.
 */
export const endedHabits = async (weekStart) => {
  const month = monthOfWeek(weekStart);
  const renewals = await listRenewals(month);
  if (!renewals) return [];
  const prev = await latestHabitWeek(month);
  if (!prev) return [];

  const { data, error } = await supabase
    .from("weeks")
    .select("week_tasks(text)")
    .gte("week_start", month)
    .lt("week_start", nextMonthKey(month));
  if (error) throw new Error(error.message);
  const present = new Set(data.flatMap((w) => w.week_tasks.map((t) => t.text.trim())));

  return habitNames(prev).filter((h) => !renewals.has(h) && !present.has(h));
};

/**
 * Stores the answer for one habit in the month of `weekStart`. Continuing it also adds it to
 * that week and to any later week of the month already saved without it.
 */
export const renewHabit = async ({ userId, weekStart, text, continued }) => {
  const month = monthOfWeek(weekStart);
  check(
    await supabase
      .from("habit_renewals")
      .upsert(
        { user_id: userId, month_start: month, text, continued },
        { onConflict: "user_id,month_start,text" },
      ),
  );
  if (!continued) return;

  const { data, error } = await supabase
    .from("weeks")
    .select("id, week_start, week_tasks(position, text)")
    .gte("week_start", weekStart)
    .lt("week_start", nextMonthKey(month));
  if (error) throw new Error(error.message);
  const weeks = data.some((w) => w.week_start === weekStart)
    ? data
    : [{ id: null, week_start: weekStart, week_tasks: [] }, ...data];

  for (const w of weeks) {
    if (w.week_tasks.some((t) => t.text.trim() === text)) continue;
    const last = w.week_tasks.reduce((m, t) => Math.max(m, t.position), 0);
    await saveWeekJob({
      userId,
      weekStart: w.week_start,
      weekId: w.id,
      job: { tasks: new Map([[uuid(), { position: last + 1000, text, days: Array(7).fill(false) }]]) },
    });
  }
};

/**
 * Loads one week. With `carry`, a week that has never been saved starts with last week's
 * habits (unchecked) and is flagged `carried` so the caller stores them.
 */
export const loadWeek = async (weekStart, { carry = false } = {}) => {
  const { data, error } = await supabase
    .from("weeks")
    .select("id, notes, week_tasks(id, position, text, days)")
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const stored = data
    ? data.week_tasks
        .map((t) => ({ id: t.id, position: t.position, text: t.text, days: t.days }))
        .sort((a, b) => a.position - b.position)
    : [];
  // a week with no habits yet (never saved, or saved with only notes) starts from the previous one
  if (stored.length === 0 && carry) {
    const tasks = await carriedHabits(weekStart);
    if (tasks.length) return { weekId: data?.id ?? null, notes: data?.notes ?? "", tasks, carried: true };
  }
  if (!data) return { weekId: null, notes: "", tasks: [] };

  return {
    weekId: data.id,
    notes: data.notes,
    tasks: stored,
  };
};

// Creates the week row if it doesn't exist yet. Never overwrites an existing one.
const ensureWeek = async (userId, weekStart) => {
  check(
    await supabase
      .from("weeks")
      .upsert(
        { user_id: userId, week_start: weekStart },
        { onConflict: "user_id,week_start", ignoreDuplicates: true },
      ),
  );
  const { data, error } = await supabase
    .from("weeks")
    .select("id")
    .eq("week_start", weekStart)
    .single();
  if (error) throw new Error(error.message);
  return data.id;
};

/**
 * Writes only what changed: the notes, and the individual task rows touched.
 * job = { notes?: string, tasks: Map<taskId, {position, text, days} | null> }
 * (null means delete). Returns the week's id.
 */
export const saveWeekJob = async ({ userId, weekStart, weekId, job }) => {
  const id = weekId || (await ensureWeek(userId, weekStart));

  if (job.notes !== undefined) {
    check(await supabase.from("weeks").update({ notes: job.notes }).eq("id", id));
  }

  const upserts = [];
  const deletes = [];
  for (const [taskId, task] of job.tasks) {
    if (task) {
      upserts.push({
        id: taskId,
        user_id: userId,
        week_id: id,
        position: task.position,
        text: task.text,
        days: task.days,
      });
    } else {
      deletes.push(taskId);
    }
  }

  if (upserts.length) {
    check(await supabase.from("week_tasks").upsert(upserts, { onConflict: "id" }));
  }
  if (deletes.length) {
    check(await supabase.from("week_tasks").delete().in("id", deletes));
  }
  return id;
};

// ---------------------------------------------------------------- goals

const GOAL_COLUMNS = "id, title, start_date, end_date, current_value, target_value, unit, completed";

const toGoal = (r) => ({
  id: r.id,
  title: r.title,
  startDate: r.start_date,
  endDate: r.end_date,
  current: Number(r.current_value),
  target: r.target_value === null ? null : Number(r.target_value),
  unit: r.unit,
  completed: r.completed,
});

// 23505 is Postgres "unique violation": the same title and dates already exist for this account
const goalError = (error) => {
  const err = new Error(
    error.code === "23505"
      ? "You already have a goal with this title and these dates."
      : error.message,
  );
  err.code = error.code;
  return err;
};

export const listGoals = async () => {
  const { data, error } = await supabase
    .from("goals")
    .select(GOAL_COLUMNS)
    .order("start_date")
    .order("created_at");
  if (error) throw goalError(error);
  return data.map(toGoal);
};

/** Insert or update by id, so saving the same goal twice can never create a duplicate. */
export const saveGoal = async (userId, goal) => {
  const { data, error } = await supabase
    .from("goals")
    .upsert(
      {
        id: goal.id,
        user_id: userId,
        title: goal.title,
        start_date: goal.startDate,
        end_date: goal.endDate,
        current_value: goal.current,
        target_value: goal.target,
        unit: goal.unit,
        completed: goal.completed,
      },
      { onConflict: "id" },
    )
    .select(GOAL_COLUMNS)
    .single();
  if (error) throw goalError(error);
  return toGoal(data);
};

export const deleteGoal = async (id) => {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw goalError(error);
};
