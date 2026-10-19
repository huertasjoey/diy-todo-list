import { useState } from "react";
import { MAX_TARGET, MIN_TARGET, PRESETS, clampTarget, goalProgress, isValidTarget, loadGoal, saveGoal } from "../lib/wordGoal";
import { CheckIcon } from "./Icons";

/**
 * The daily word goal: a target, and a live bar showing how close the entry is.
 * `words` is everything written in the entry (journal plus reflections).
 */
const WordGoal = ({ words }) => {
  const [goal, setGoal] = useState(loadGoal);
  const [draft, setDraft] = useState(() => String(goal.target));

  const change = (patch) => {
    const next = { ...goal, ...patch };
    setGoal(next);
    saveGoal(next);
  };

  const pick = (target) => {
    change({ target });
    setDraft(String(target));
  };

  const { pct, reached, remaining } = goalProgress(words, goal.target);

  return (
    <section aria-label="Daily word goal" className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Daily word goal</h3>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={goal.enabled}
            onChange={(e) => change({ enabled: e.target.checked })}
            className="h-5 w-5 cursor-pointer accent-[var(--accent)]"
          />
          Use a goal
        </label>
      </div>

      {goal.enabled && (
        <>
          <div
            role="progressbar"
            aria-label="Words written toward your daily goal"
            aria-valuemin={0}
            aria-valuemax={goal.target}
            aria-valuenow={Math.min(words, goal.target)}
            aria-valuetext={`${words} of ${goal.target} words`}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="tabular-nums">
              <strong className="font-semibold">{words.toLocaleString()}</strong> / {goal.target.toLocaleString()} words
            </span>
            {reached ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                <CheckIcon width={15} height={15} strokeWidth={3} aria-hidden="true" />
                {words > goal.target ? `Goal reached, ${(words - goal.target).toLocaleString()} over` : "Goal reached"}
              </span>
            ) : (
              <span className="tabular-nums text-muted">{remaining.toLocaleString()} to go</span>
            )}
          </div>

          <details className="mt-3">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-muted transition-colors hover:text-ink">
              Change goal
            </summary>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div role="radiogroup" aria-label="Goal size" className="flex flex-wrap gap-2">
                {PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={goal.target === n}
                    onClick={() => pick(n)}
                    className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium tabular-nums transition-colors ${
                      goal.target === n ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="word-goal-custom" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Your own
                </label>
                <input
                  id="word-goal-custom"
                  type="number"
                  inputMode="numeric"
                  min={MIN_TARGET}
                  max={MAX_TARGET}
                  step={1}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    // use it as soon as it is a valid goal; otherwise wait until they finish typing
                    if (isValidTarget(e.target.value)) change({ target: Number(e.target.value) });
                  }}
                  onBlur={() => {
                    const n = clampTarget(draft);
                    if (n === null) return setDraft(String(goal.target));
                    pick(n);
                  }}
                  aria-describedby="word-goal-hint"
                  className="min-h-11 w-28 rounded-xl border border-line bg-bg px-3 text-sm tabular-nums outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
              </div>
            </div>
            <p id="word-goal-hint" className="mt-2 text-xs text-muted">
              Between {MIN_TARGET} and {MAX_TARGET.toLocaleString()} words. Saved on this device.
            </p>
          </details>
        </>
      )}

      {/* spoken once, only when the goal is first met (the text only changes at that moment) */}
      <p role="status" className="sr-only">
        {goal.enabled && reached ? "Daily word goal reached." : ""}
      </p>
    </section>
  );
};

export default WordGoal;
