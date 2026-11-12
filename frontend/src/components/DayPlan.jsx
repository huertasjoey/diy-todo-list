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
    <section aria-labelledby={`${id}-heading`} className="flex min-w-0 flex-col p-6 sm:p-7">
      <p className="eyebrow">{dayFmt.format(parseKey(date))}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h3 id={`${id}-heading`} className="font-display text-[2rem] leading-none tracking-tight">
          {heading}
        </h3>
        {showProgress && total > 0 && (
          <span className="text-xs tabular-nums text-muted" aria-live="polite">
            {done === total ? "All done" : `${done} of ${total} done`}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{note}</p>

      {tasks.length === 0 ? (
        <p className="mt-5 font-display text-lg italic text-muted">{emptyText}</p>
      ) : (
        <ul aria-label={`${heading} tasks`} className="-mx-1 mt-3">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onRemove={onRemove} />
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-auto flex items-center gap-2 border-b border-line pt-4 transition-colors focus-within:border-accent" noValidate>
        <PlusIcon width={16} height={16} aria-hidden="true" className="shrink-0 text-muted" />
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
          placeholder="Add a task"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="min-h-9 cursor-pointer rounded-full px-3 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft disabled:cursor-default disabled:opacity-0"
        >
          Add
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
  <section aria-label="Daily plan" className="no-print">
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
      <div className="sheet h-56 animate-pulse" role="status" aria-label="Loading your daily plan" />
    ) : (
      <div className="sheet grid grid-cols-[minmax(0,1fr)] divide-y divide-line md:grid-cols-[repeat(2,minmax(0,1fr))] md:divide-x md:divide-y-0">
        <DayList
          heading="Today"
          note="What you want to get done today."
          date={plan.todayKey}
          tasks={forDay(plan.tasks, plan.todayKey)}
          emptyText="A clear day. Add a task, or plan it the evening before."
          showProgress
          onAdd={plan.add}
          onToggle={plan.toggle}
          onEdit={plan.edit}
          onRemove={plan.remove}
        />
        <DayList
          heading="Tomorrow"
          note="Optional. Jot down tomorrow's tasks and they'll be waiting for you."
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
