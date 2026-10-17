import { supabase } from "./supabase";

// All planner reads and writes go through here. Every table is protected by
// Row Level Security, so each query only ever sees the signed-in user's rows.

const check = ({ error }) => {
  if (error) throw new Error(error.message);
};

export const loadWeek = async (weekStart) => {
  const { data, error } = await supabase
    .from("weeks")
    .select("id, notes, week_tasks(id, position, text, days)")
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { weekId: null, notes: "", tasks: [] };

  return {
    weekId: data.id,
    notes: data.notes,
    tasks: data.week_tasks
      .map((t) => ({ id: t.id, position: t.position, text: t.text, days: t.days }))
      .sort((a, b) => a.position - b.position),
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
