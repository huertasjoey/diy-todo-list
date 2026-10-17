import { addDays, parseKey, toKey } from "./dates";

export const MAX_TITLE = 200; // same as the database check
export const MAX_UNIT = 30;
export const MAX_VALUE = 1_000_000_000;

/** A target is optional. Without one there is no progress to measure. */
export const hasTarget = (g) => g.target != null && g.target > 0;

/**
 * 0-100, never negative, capped at 100 even when the current value passes the target.
 * null when the goal has no target.
 */
export const progressPercent = (g) => {
  if (!hasTarget(g)) return null;
  const pct = (Math.max(0, g.current) / g.target) * 100;
  // floor, so 100% only ever means "reached", never "99.6% rounded up"
  return Math.min(100, Math.floor(pct));
};

/** "37% complete" for screen readers, or a plain note when there is no target. */
export const percentLabel = (g) => {
  const pct = progressPercent(g);
  return pct === null ? "no target set" : `${pct}% complete`;
};

/** Reached the target, or marked done by hand (the only way to finish a goal with no target). */
export const isCompleted = (g) => Boolean(g.completed) || (hasTarget(g) && g.current >= g.target);

/**
 * completed: current reached the target
 * overdue:   the end date has passed and it isn't completed (a late date never completes a goal by itself)
 * active:    everything else, including goals that start in the future
 */
export const goalStatus = (g, todayKey) => {
  if (isCompleted(g)) return "completed";
  if (g.endDate < todayKey) return "overdue";
  return "active";
};

// Class names are written out in full so Tailwind can see them.
export const STATUS = {
  active: {
    label: "Active",
    bar: "border-goal bg-goal-soft",
    text: "text-goal",
    fill: "bg-goal",
    badge: "bg-goal-soft text-goal",
  },
  completed: {
    label: "Completed",
    bar: "border-accent bg-accent-soft",
    text: "text-accent",
    fill: "bg-accent",
    badge: "bg-accent-soft text-accent",
  },
  overdue: {
    label: "Overdue",
    bar: "border-danger bg-danger/10",
    text: "text-danger",
    fill: "bg-danger",
    badge: "bg-danger/10 text-danger",
  },
};

const ORDER = { active: 0, overdue: 1, completed: 2 };

/** Active goals by nearest deadline, then overdue, then completed. */
export const sortGoals = (goals, todayKey) =>
  [...goals].sort(
    (a, b) =>
      ORDER[goalStatus(a, todayKey)] - ORDER[goalStatus(b, todayKey)] ||
      a.endDate.localeCompare(b.endDate) ||
      a.title.localeCompare(b.title),
  );

const dayDiff = (fromKey, toKeyValue) =>
  Math.round((parseKey(toKeyValue) - parseKey(fromKey)) / 86400000);

export const timeLeftText = (g, todayKey) => {
  const status = goalStatus(g, todayKey);
  if (status === "completed") return "Completed";
  if (status === "overdue") {
    const n = dayDiff(g.endDate, todayKey);
    return `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (g.startDate > todayKey) {
    const n = dayDiff(todayKey, g.startDate);
    return `Starts in ${n} day${n === 1 ? "" : "s"}`;
  }
  const n = dayDiff(todayKey, g.endDate);
  if (n === 0) return "Ends today";
  return `${n} day${n === 1 ? "" : "s"} left`;
};

const numberFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export const formatValue = (n) => numberFmt.format(n);

export const progressText = (g) => {
  const unit = g.unit ? ` ${g.unit}` : "";
  if (hasTarget(g)) return `${formatValue(g.current)} / ${formatValue(g.target)}${unit}`;
  return g.current > 0 ? `${formatValue(g.current)}${unit} so far` : "No target set";
};

const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
export const formatDate = (key) => dateFmt.format(parseKey(key));
export const formatRangeText = (g) =>
  g.startDate === g.endDate
    ? formatDate(g.startDate)
    : `${formatDate(g.startDate)} – ${formatDate(g.endDate)}`;

const isRealDate = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key) && toKey(parseKey(key)) === key;

/** Form values are strings. Returns { field: message }, empty when everything is valid. */
export const validateGoal = (v) => {
  const e = {};
  const title = v.title.trim();
  if (!title) e.title = "Give your goal a title.";
  else if (title.length > MAX_TITLE) e.title = `Keep the title to ${MAX_TITLE} characters or fewer.`;

  if (!v.start) e.start = "Choose a start date.";
  else if (!isRealDate(v.start)) e.start = "Enter a valid start date.";

  if (!v.end) e.end = "Choose an end date.";
  else if (!isRealDate(v.end)) e.end = "Enter a valid end date.";
  else if (!e.start && v.end < v.start) e.end = "The end date can't be earlier than the start date.";

  // Current and Target are optional. When filled in they have to make sense.
  if (v.current.trim() !== "") {
    const current = Number(v.current);
    if (!Number.isFinite(current)) e.current = "Current must be a number.";
    else if (current < 0) e.current = "Progress can't be negative.";
    else if (current > MAX_VALUE) e.current = "That number is too large.";
  }

  if (v.target.trim() !== "") {
    const target = Number(v.target);
    if (!Number.isFinite(target)) e.target = "Target must be a number.";
    else if (target <= 0) e.target = "The target must be greater than 0.";
    else if (target > MAX_VALUE) e.target = "That number is too large.";
  }

  if (v.unit.trim().length > MAX_UNIT) e.unit = `Keep the unit to ${MAX_UNIT} characters or fewer.`;
  return e;
};

const round2 = (n) => Math.round(n * 100) / 100;

/** Validated form values -> a goal object. */
export const goalFromForm = (v) => ({
  title: v.title.trim(),
  startDate: v.start,
  endDate: v.end,
  // blank current means "not started" (0); blank target means "no target"
  current: v.current.trim() === "" ? 0 : round2(Number(v.current)),
  target: v.target.trim() === "" ? null : round2(Number(v.target)),
  unit: v.unit.trim(),
  completed: Boolean(v.completed),
});

export const formFromGoal = (g) => ({
  title: g.title,
  start: g.startDate,
  end: g.endDate,
  current: String(g.current),
  target: g.target == null ? "" : String(g.target),
  unit: g.unit,
  completed: Boolean(g.completed),
});

/** Goals whose date range includes this day. */
export const goalsOnDay = (goals, key) => goals.filter((g) => g.startDate <= key && key <= g.endDate);

/**
 * Lay the week's goals out as calendar bars. Overlapping goals get separate lanes.
 * Returns an array of lanes; each lane is [{ goal, start, end, clippedLeft, clippedRight }]
 * where start/end are day indexes 0 (Mon) .. 6 (Sun).
 */
export const weekLanes = (goals, monday) => {
  const weekStart = toKey(monday);
  const weekEnd = toKey(addDays(monday, 6));
  const inWeek = goals
    .filter((g) => g.startDate <= weekEnd && g.endDate >= weekStart)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        b.endDate.localeCompare(a.endDate) ||
        a.title.localeCompare(b.title),
    );

  const lanes = [];
  for (const goal of inWeek) {
    const start = Math.max(0, dayDiff(weekStart, goal.startDate));
    const end = Math.min(6, dayDiff(weekStart, goal.endDate));
    const segment = {
      goal,
      start,
      end,
      clippedLeft: goal.startDate < weekStart,
      clippedRight: goal.endDate > weekEnd,
    };
    const lane = lanes.find((l) => l.every((s) => s.end < start));
    if (lane) lane.push(segment);
    else lanes.push([segment]);
  }
  return lanes;
};
