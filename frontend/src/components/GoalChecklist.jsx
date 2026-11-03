import { useState } from "react";
import { MAX_STEP, MAX_STEPS } from "../lib/goals";
import { suggestGoalSteps } from "../lib/plannerDb";
import { uuid } from "../lib/uuid";
import { CheckIcon, PlusIcon, XIcon } from "./Icons";

const smallBtn =
  "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-50";

/**
 * The steps toward a goal: tick them off, edit them, remove them, add more by hand, or ask the
 * AI to suggest some from the goal's title. `steps` is [{ id, text, done }].
 */
const GoalChecklist = ({ id, title, steps, onChange }) => {
  const [draft, setDraft] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [problem, setProblem] = useState("");

  const done = steps.filter((s) => s.done).length;
  const full = steps.length >= MAX_STEPS;
  const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

  const update = (stepId, change) => onChange(steps.map((s) => (s.id === stepId ? { ...s, ...change } : s)));
  const remove = (stepId) => onChange(steps.filter((s) => s.id !== stepId));

  const add = () => {
    const text = draft.trim();
    if (!text || full) return;
    if (steps.some((s) => same(s.text, text))) return setProblem(`“${text}” is already on the checklist.`);
    onChange([...steps, { id: uuid(), text, done: false }]);
    setDraft("");
    setProblem("");
  };

  const suggest = async () => {
    setProblem("");
    setSuggesting(true);
    try {
      const found = await suggestGoalSteps({ title: title.trim(), existing: steps.map((s) => s.text) });
      const fresh = found.filter((t) => !steps.some((s) => same(s.text, t))).slice(0, MAX_STEPS - steps.length);
      if (!fresh.length) setProblem("No new steps to suggest. Your checklist already covers it.");
      else onChange([...steps, ...fresh.map((text) => ({ id: uuid(), text, done: false }))]);
    } catch (e) {
      setProblem(e.message);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Checklist (optional)
        </span>
        {steps.length > 0 && (
          <span className="text-xs tabular-nums text-muted" aria-live="polite">
            {done} of {steps.length} done
          </span>
        )}
      </div>

      {steps.length > 0 && (
        <>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <ul aria-labelledby={`${id}-label`} className="divide-y divide-line/70 rounded-xl border border-line bg-bg">
            {steps.map((s, i) => (
              <li key={s.id} className="group flex items-center gap-1 pr-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.done}
                  aria-label={`${s.done ? "Mark not done" : "Mark done"}: ${s.text}`}
                  onClick={() => update(s.id, { done: !s.done })}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      s.done ? "border-accent bg-accent text-accent-ink" : "border-muted/60 hover:border-accent"
                    }`}
                  >
                    {s.done && <CheckIcon width={13} height={13} strokeWidth={3} />}
                  </span>
                </button>
                <input
                  type="text"
                  value={s.text}
                  maxLength={MAX_STEP}
                  aria-label={`Step ${i + 1}`}
                  onChange={(e) => update(s.id, { text: e.target.value })}
                  className={`min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none ${
                    s.done ? "text-muted line-through decoration-muted/60" : "text-ink"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  aria-label={`Remove step: ${s.text}`}
                  title="Remove step"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
                >
                  <XIcon width={15} height={15} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          maxLength={MAX_STEP}
          disabled={full}
          autoComplete="off"
          placeholder={full ? `Up to ${MAX_STEPS} steps` : "Add a step, e.g. Learn Python basics"}
          onChange={(e) => {
            setDraft(e.target.value);
            if (problem) setProblem("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // Enter adds the step instead of saving the goal
              add();
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || full}
          aria-label="Add step"
          className={`${smallBtn} border border-line hover:bg-surface-2`}
        >
          <PlusIcon width={15} height={15} /> Add
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {title.trim() ? "Not sure where to start? Let AI suggest steps from your goal." : "Write the goal above to get suggested steps."}
        </p>
        <button
          type="button"
          onClick={suggest}
          disabled={!title.trim() || suggesting || full}
          className={`${smallBtn} border border-accent/40 bg-accent-soft hover:opacity-90`}
        >
          {suggesting ? "Thinking…" : "Suggest steps"}
        </button>
      </div>

      {problem && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {problem}
        </p>
      )}
    </div>
  );
};

export default GoalChecklist;
