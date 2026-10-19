import { supabase } from "./supabase";

// Protected by Row Level Security: every query only ever sees the signed-in person's own tasks.

const COLUMNS = "id, task_date, text, done, position, created_at";

const toTask = (r) => ({
  id: r.id,
  date: r.task_date,
  text: r.text,
  done: r.done,
  position: r.position,
  createdAt: r.created_at,
});

const fail = (code, message) => Object.assign(new Error(message), { code });

/** Tasks for every date from `from` to `to` (inclusive), in order. */
export const listTasks = async (from, to) => {
  const { data, error } = await supabase
    .from("day_tasks")
    .select(COLUMNS)
    .gte("task_date", from)
    .lte("task_date", to)
    .order("task_date", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(toTask);
};

/** The id is made on the device first, so saving the same task twice can never duplicate it. */
export const createTask = async (userId, task) => {
  const { data, error } = await supabase
    .from("day_tasks")
    .insert({
      id: task.id,
      user_id: userId,
      task_date: task.date,
      text: task.text,
      done: task.done,
      position: task.position,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === "23514") throw fail("limit", "A day can have up to 30 tasks. Finish or delete one first.");
    throw new Error(error.message);
  }
  return toTask(data);
};

/** patch: { text } and/or { done } */
export const updateTask = async (id, patch) => {
  const { data, error } = await supabase.from("day_tasks").update(patch).eq("id", id).select(COLUMNS);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw fail("gone", "That task no longer exists. It may have been deleted on another device.");
  return toTask(data[0]);
};

export const deleteTask = async (id) => {
  const { error } = await supabase.from("day_tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
