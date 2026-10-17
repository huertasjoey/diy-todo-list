import { useEffect, useId, useRef, useState } from "react";
import {
  STATUS,
  formatRangeText,
  formFromGoal,
  goalFromForm,
  goalStatus,
  hasTarget,
  progressPercent,
  progressText,
  timeLeftText,
  validateGoal,
} from "../lib/goals";
import { uuid } from "../lib/uuid";
import GoalProgress from "./GoalProgress";

const UNIT_SUGGESTIONS = ["pages", "books", "km", "hours", "tasks", "workouts", "days"];

const inputCls =
  "w-full rounded-xl border bg-bg px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:ring-4 focus:ring-accent/15";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted";

const Field = ({ id, label, hint, error, children }) => (
  <div>
    <label htmlFor={id} className={labelCls}>
      {label}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )
    )}
  </div>
);

// the live preview must not break while a field holds half-typed text
const previewFields = (v) => {
  const num = (raw) => (raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null);
  const target = num(v.target);
  return {
    current: Math.max(0, num(v.current) ?? 0),
    target: target !== null && target > 0 ? target : null,
    completed: Boolean(v.completed),
  };
};

const todayValues = (todayKey) => ({
  title: "",
  start: todayKey,
  end: "",
  current: "",
  target: "",
  unit: "",
  completed: false,
});

/**
 * Create or edit a goal. Mount it to open it; unmount to close. Native <dialog>, so Escape,
 * focus trapping and the backdrop all behave like a real modal.
 * onSave(goal, id) and onDelete() resolve to an error message, or null on success.
 */
const GoalModal = ({ goal, todayKey, onSave, onDelete, onClose }) => {
  const editing = Boolean(goal);
  const uid = useId();
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  // one id for this whole form session, so a double click or a retry is the same goal
  const [newId] = useState(uuid);
  const [values, setValues] = useState(() => (goal ? formFromGoal(goal) : todayValues(todayKey)));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const id = (name) => `${uid}-${name}`;
  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    // clear that field's message as soon as the user starts fixing it
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    if (formError) setFormError("");
  };

  const fieldProps = (name, extra = {}) => ({
    id: id(name),
    value: values[name],
    onChange: (e) => set(name, e.target.value),
    "aria-invalid": errors[name] ? "true" : undefined,
    "aria-describedby": errors[name] ? `${id(name)}-error` : extra.hint ? `${id(name)}-hint` : undefined,
    className: `${inputCls} ${errors[name] ? "border-danger" : "border-line focus:border-accent"}`,
  });

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const found = validateGoal(values);
    setErrors(found);
    const first = ["title", "start", "end", "current", "target", "unit"].find((k) => found[k]);
    if (first) {
      formRef.current?.querySelector(`#${CSS.escape(id(first))}`)?.focus();
      return;
    }
    setSaving(true);
    const message = await onSave(goalFromForm(values), newId);
    // on success the parent unmounts this modal, so only failures need handling here
    if (message) {
      setFormError(message);
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    const message = await onDelete();
    if (message) {
      setFormError(message);
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  // live preview of the saved goal, so the details view stays in step with what is typed
  const preview = editing ? { ...goal, ...previewFields(values) } : null;
  const status = preview ? goalStatus(preview, todayKey) : null;
  // reaching the target completes a goal by itself; the box is then locked on
  const autoCompleted = Boolean(preview) && hasTarget(preview) && preview.current >= preview.target;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby={id("heading")}
      className="m-auto max-h-[92vh] w-[min(94vw,34rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <form ref={formRef} onSubmit={submit} noValidate className="p-6 sm:p-8">
        <h2 id={id("heading")} className="font-display text-3xl leading-tight">
          {editing ? "Goal details" : "Add a goal"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {editing
            ? "Update your progress or change the plan."
            : "Pick a target and a date range. It will show on your calendar."}
        </p>

        {editing && (
          <div className="mt-5 rounded-xl border border-line bg-bg p-4" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[status].badge}`}>
                {STATUS[status].label}
              </span>
              <span className="text-xs text-muted">{timeLeftText(preview, todayKey)}</span>
            </div>
            <GoalProgress goal={preview} status={status} className="mt-3" />
            <div className={`${hasTarget(preview) ? "mt-2" : "mt-3"} flex items-baseline justify-between text-sm`}>
              <span className={hasTarget(preview) || preview.current > 0 ? "" : "text-muted"}>{progressText(preview)}</span>
              {hasTarget(preview) && (
                <span className="font-semibold tabular-nums">{progressPercent(preview)}%</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">{formatRangeText(goal)}</p>
          </div>
        )}

        {formError && (
          <p role="alert" className="mt-5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="mt-6 space-y-5">
          <Field id={id("title")} label="Goal" error={errors.title}>
            <input
              {...fieldProps("title")}
              type="text"
              maxLength={200}
              autoComplete="off"
              placeholder="e.g. Read 12 books"
              autoFocus={!editing}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={id("start")} label="Start date" error={errors.start}>
              <input {...fieldProps("start")} type="date" />
            </Field>
            <Field id={id("end")} label="End date" error={errors.end}>
              <input {...fieldProps("end")} type="date" min={values.start || undefined} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={id("current")} label="Current (optional)" error={errors.current} hint="Where you are now. Blank starts at 0.">
              <input
                {...fieldProps("current", { hint: true })}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
              />
            </Field>
            <Field id={id("target")} label="Target value (optional)" error={errors.target} hint="Leave blank to skip the progress bar.">
              <input
                {...fieldProps("target", { hint: true })}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="12"
              />
            </Field>
          </div>

          <Field id={id("unit")} label="Unit (optional)" error={errors.unit}>
            <input
              {...fieldProps("unit")}
              type="text"
              maxLength={30}
              list={id("units")}
              autoComplete="off"
              placeholder="books, pages, km…"
            />
            <datalist id={id("units")}>
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>

          <div>
            <label htmlFor={id("completed")} className="flex min-h-11 cursor-pointer items-center gap-3 has-[:disabled]:cursor-default">
              <input
                id={id("completed")}
                type="checkbox"
                checked={autoCompleted || values.completed}
                disabled={autoCompleted}
                onChange={(e) => set("completed", e.target.checked)}
                aria-describedby={id("completed-hint")}
                className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)] disabled:cursor-default"
              />
              <span className="text-sm font-medium">Mark as completed</span>
            </label>
            <p id={id("completed-hint")} className="ml-8 text-xs text-muted">
              {autoCompleted
                ? "Completed automatically: you have reached the target."
                : "Goals with a target complete themselves. Tick this to finish one early, or one with no target."}
            </p>
          </div>
        </div>

        {confirmDelete ? (
          <div className="mt-7 rounded-xl border border-danger/40 bg-danger/10 p-4" role="alertdialog" aria-label="Confirm delete">
            <p className="text-sm">Delete this goal? This can&apos;t be undone.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={saving}
                className="min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2"
              >
                Keep goal
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="min-h-11 cursor-pointer rounded-full bg-danger px-5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Deleting…" : "Delete goal"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editing && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-11 cursor-pointer rounded-full px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 cursor-pointer rounded-full border border-line px-6 text-sm font-medium transition-colors hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 cursor-pointer rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save goal"}
              </button>
            </div>
          </div>
        )}
      </form>
    </dialog>
  );
};

export default GoalModal;
