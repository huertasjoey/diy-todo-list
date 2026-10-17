import { STATUS, progressPercent } from "../lib/goals";

/** A thin progress bar. Never negative, never past 100%. */
const GoalProgress = ({ goal, status, className = "" }) => {
  const pct = progressPercent(goal);
  if (pct === null) return null; // no target, nothing to measure
  return (
    <div
      role="progressbar"
      aria-label={`${goal.title} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-2 overflow-hidden rounded-full bg-line ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${STATUS[status].fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default GoalProgress;
