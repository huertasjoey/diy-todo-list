// A daily word goal: how many words you aim to write in an entry.
// It's a per-device preference (like the theme), so it lives in localStorage, not the database.

export const PRESETS = [50, 100, 150, 300, 500];
export const MIN_TARGET = 10;
export const MAX_TARGET = 5000;
export const DEFAULT_GOAL = { enabled: true, target: 150 };

const KEY = "kaizen-word-goal";

/** A whole number between the limits, or null when it isn't a number at all. */
export const clampTarget = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, n));
};

/** True when the typed value can be used as it is (no rounding or clamping needed). */
export const isValidTarget = (value) => {
  const n = Number(value);
  return value !== "" && Number.isInteger(n) && n >= MIN_TARGET && n <= MAX_TARGET;
};

export const loadGoal = (storage = globalThis.localStorage) => {
  try {
    const raw = JSON.parse(storage.getItem(KEY));
    return {
      enabled: raw?.enabled !== false,
      target: clampTarget(raw?.target) ?? DEFAULT_GOAL.target,
    };
  } catch {
    // no storage, or a damaged value: start from the default rather than failing
    return { ...DEFAULT_GOAL };
  }
};

export const saveGoal = (goal, storage = globalThis.localStorage) => {
  try {
    storage.setItem(KEY, JSON.stringify(goal));
  } catch {
    // private mode: the goal still works for this visit
  }
};

/** pct is 0-100 and only reaches 100 once the goal is actually met (never rounds up to it). */
export const goalProgress = (words, target) => {
  const w = Math.max(0, words);
  return {
    pct: Math.min(100, Math.floor((w / target) * 100)),
    reached: w >= target,
    remaining: Math.max(0, target - w),
  };
};
