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
