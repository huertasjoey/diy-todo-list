import { useRef, useState } from "react";
import { parseKey } from "../lib/dates";
import { MAX_PER_DAY, MAX_TEXT, forDay, summary } from "../lib/dayTasks";
import { CheckIcon, PlusIcon, TrashIcon } from "./Icons";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });

const TaskRow = ({ task, onToggle, onEdit, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const [problem, setProblem] = useState("");
  const cancelled = useRef(false);

  const startEdit = () => {
    cancelled.current = false;
    setDraft(task.text);
    setProblem("");
    setEditing(true);
  };

  const finish = async () => {
    const message = await onEdit(task.id, draft);
    if (message) return setProblem(message);
    setProblem("");
    setEditing(false);
  };

  return (
    <li className="group rounded-xl px-1 transition-colors hover:bg-surface-2/60">
      <div className="flex items-center gap-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={`${task.done ? "Mark not done" : "Mark done"}: ${task.text}`}
          onClick={() => onToggle(task.id)}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
              task.done ? "border-accent bg-accent text-accent-ink" : "border-muted/60 hover:border-accent"
            }`}
          >
            {task.done && <CheckIcon width={14} height={14} strokeWidth={3} />}
          </span>
        </button>

        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={MAX_TEXT + 50}
            aria-label={`Edit task: ${task.text}`}
            aria-invalid={problem ? "true" : undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              if (problem) setProblem("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                finish();
              } else if (e.key === "Escape") {
                cancelled.current = true;
                setEditing(false);
              }
            }}
            onBlur={() => {
              if (cancelled.current) return;
              // leaving an emptied box puts the old text back instead of showing an error
              if (!draft.trim()) return setEditing(false);
              finish();
            }}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            title="Click to edit"
            className={`min-h-11 min-w-0 flex-1 cursor-text break-words py-2 text-left text-[15px] ${
              task.done ? "text-muted line-through decoration-muted/50" : ""
            }`}
          >
            {task.text}
          </button>
        )}

        <button
          type="button"
          onClick={() => onRemove(task.id)}
          aria-label={`Delete task: ${task.text}`}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
        >
          <TrashIcon width={16} height={16} aria-hidden="true" />
        </button>
      </div>
      {problem && (
        <p role="alert" className="pb-2 pl-12 text-xs text-danger">
          {problem}
        </p>
      )}
    </li>
  );
};

const DayList = ({ heading, note, date, tasks, emptyText, showProgress, onAdd, onToggle, onEdit, onRemove }) => {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");
  const lastAdded = useRef(0);
  const { done, total } = summary(tasks);

  const submit = async (e) => {
    e.preventDefault();
    const value = text;
    // a second Enter right after a successful add is just a double press, not a mistake
    if (!value.trim() && Date.now() - lastAdded.current < 700) return;
    setProblem("");
    setText(""); // clear straight away, so a quick second press can't add it twice
    const message = await onAdd(date, value);
    if (message) {
      setText(value);
      setProblem(message);
    } else {
      lastAdded.current = Date.now();
    }
  };

  const id = `plan-${date}`;
  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id={`${id}-heading`} className="font-display text-2xl leading-none">
          {heading}
        </h3>
        <span className="text-xs text-muted">{dayFmt.format(parseKey(date))}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{note}</p>

      {tasks.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{emptyText}</p>
      ) : (
        <ul aria-label={`${heading} tasks`} className="mt-3">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onRemove={onRemove} />
          ))}
        </ul>
      )}

      {showProgress && total > 0 && (
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {done === total ? "All done for today." : `${done} of ${total} done`}
        </p>
      )}

      <form onSubmit={submit} className="mt-3 flex gap-2" noValidate>
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (problem) setProblem("");
          }}
          maxLength={MAX_TEXT + 50}
          autoComplete="off"
          aria-label={`Add a task for ${heading.toLowerCase()}`}
          aria-invalid={problem ? "true" : undefined}
          placeholder="Add a task…"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
        >
          <PlusIcon width={16} height={16} aria-hidden="true" /> Add
        </button>
      </form>
      {problem && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {problem}
        </p>
      )}
      {tasks.length >= MAX_PER_DAY - 5 && tasks.length < MAX_PER_DAY && (
        <p className="mt-2 text-xs text-muted">
          {tasks.length} of {MAX_PER_DAY} tasks used for this day.
        </p>
      )}
    </section>
  );
};

/** Today's tasks, and an optional list for tomorrow that turns into today's at midnight. */
const DayPlan = ({ plan }) => (
  <section aria-label="Daily plan" className="no-print mb-6">
    {plan.status === "error" ? (
      <div className="rounded-2xl border border-dashed border-line px-6 py-8 text-center" role="alert">
        <p className="font-display text-2xl">Your daily plan didn&apos;t load</p>
        <p className="mt-1 text-sm text-muted">{plan.error || "Check your connection and try again."}</p>
        <button
          type="button"
          onClick={plan.retry}
          className="mt-4 min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          Try again
        </button>
      </div>
    ) : plan.status === "loading" ? (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[repeat(2,minmax(0,1fr))]" role="status" aria-label="Loading your daily plan">
        {[0, 1].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[repeat(2,minmax(0,1fr))]">
        <DayList
          heading="Today"
          note="What you want to get done today."
          date={plan.todayKey}
          tasks={forDay(plan.tasks, plan.todayKey)}
          emptyText="Nothing planned for today. Add a task, or plan it the evening before."
          showProgress
          onAdd={plan.add}
          onToggle={plan.toggle}
          onEdit={plan.edit}
          onRemove={plan.remove}
        />
        <DayList
          heading="Tomorrow"
          note="Optional. Write down what you'd like to do tomorrow, and it will be waiting for you."
          date={plan.tomorrowKey}
          tasks={forDay(plan.tasks, plan.tomorrowKey)}
          emptyText="Nothing planned yet. You can leave this empty."
          onAdd={plan.add}
          onToggle={plan.toggle}
          onEdit={plan.edit}
          onRemove={plan.remove}
        />
      </div>
    )}
  </section>
);

export default DayPlan;
