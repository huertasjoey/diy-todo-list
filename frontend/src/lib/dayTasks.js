import { addDays, parseKey, toKey } from "./dates";

export const MAX_TEXT = 200; // same limits the database enforces
export const MAX_PER_DAY = 30;
const STEP = 1000;

/** Tomorrow's date key, for a given "today" key. */
export const dayAfter = (key) => toKey(addDays(parseKey(key), 1));

/** The tasks planned for one date, in order. */
export const forDay = (tasks, date) =>
  tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.position - b.position || (a.createdAt || "").localeCompare(b.createdAt || ""));

/** Where a new task goes: after the last one on that day. */
export const nextPosition = (dayTasks) =>
  dayTasks.length ? Math.max(...dayTasks.map((t) => t.position)) + STEP : STEP;

export const summary = (dayTasks) => ({
  done: dayTasks.filter((t) => t.done).length,
  total: dayTasks.length,
});

/** A message when the text can't be used, or null when it can. `existing` = tasks already on that day. */
export const validateTask = (text, existing = 0, { editing = false } = {}) => {
  const t = text.trim();
  if (!t) return "Write the task first.";
  if (t.length > MAX_TEXT) return `Keep it to ${MAX_TEXT} characters or fewer.`;
  if (!editing && existing >= MAX_PER_DAY) return `A day can have up to ${MAX_PER_DAY} tasks. Finish or delete one first.`;
  return null;
};
