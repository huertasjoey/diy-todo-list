import { STATUS, formatRangeText, goalStatus, percentLabel, progressPercent, progressText, sortGoals, timeLeftText } from "../lib/goals";
import GoalProgress from "./GoalProgress";
import { CalendarIcon, PlusIcon } from "./Icons";

const addBtn =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90";

const GoalsPanel = ({ goals, status, error, todayKey, onAdd, onOpen, onRetry }) => {
  const sorted = sortGoals(goals, todayKey);
  const counts = sorted.reduce(
    (c, g) => ({ ...c, [goalStatus(g, todayKey)]: c[goalStatus(g, todayKey)] + 1 }),
    { active: 0, completed: 0, overdue: 0 },
  );

  return (
    <section
      id="goals"
      aria-labelledby="goals-heading"
      className="no-print mt-6 scroll-mt-24 rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="goals-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Goals
          </h2>
          {status === "ready" && sorted.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {counts.active} active
              {counts.overdue > 0 && <> · <span className="text-danger">{counts.overdue} overdue</span></>}
              {counts.completed > 0 && <> · {counts.completed} completed</>}
            </p>
          )}
        </div>
        <button type="button" onClick={onAdd} className={addBtn}>
          <PlusIcon width={16} height={16} /> Add goal
        </button>
      </div>

      {status === "loading" && (
        <div className="mt-5 space-y-3" role="status" aria-label="Loading goals">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="mt-5 rounded-xl border border-dashed border-line px-5 py-8 text-center" role="alert">
          <p className="font-display text-2xl">Goals didn&apos;t load</p>
          <p className="mt-1 text-sm text-muted">{error || "Check your connection and try again."}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            Try again
          </button>
        </div>
      )}

      {status === "ready" && sorted.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-line px-5 py-10 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-goal-soft text-goal">
            <CalendarIcon width={22} height={22} />
          </span>
          <p className="font-display text-2xl">No goals yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Set something to work toward, like reading 12 books by December. It will appear on your
            calendar for every day it runs.
          </p>
          <button type="button" onClick={onAdd} className={`${addBtn} mt-5`}>
            <PlusIcon width={16} height={16} /> Add your first goal
          </button>
        </div>
      )}

      {status === "ready" && sorted.length > 0 && (
        <ul className="mt-5 grid gap-3 xl:grid-cols-2">
          {sorted.map((g) => {
            const s = goalStatus(g, todayKey);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onOpen(g)}
                  aria-label={`${g.title}, ${STATUS[s].label}, ${percentLabel(g)}. Open details`}
                  className={`block w-full cursor-pointer rounded-xl border border-line border-l-4 bg-bg p-4 text-left transition-colors hover:bg-surface-2 ${STATUS[s].bar.split(" ")[0]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words text-[15px] font-semibold">{g.title}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS[s].badge}`}>
                      {STATUS[s].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatRangeText(g)} · {timeLeftText(g, todayKey)}
                  </p>
                  <GoalProgress goal={g} status={s} className="mt-3" />
                  <div className={`${progressPercent(g) === null ? "mt-3" : "mt-2"} flex items-baseline justify-between text-sm`}>
                    <span className={progressPercent(g) === null && g.current <= 0 ? "text-muted" : ""}>
                      {progressText(g)}
                    </span>
                    {progressPercent(g) !== null && (
                      <span className="font-semibold tabular-nums">{progressPercent(g)}%</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default GoalsPanel;
