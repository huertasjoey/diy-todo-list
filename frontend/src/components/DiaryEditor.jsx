import { useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useBlocker, useNavigate } from "react-router-dom";
import {
  REFLECTIONS,
  blankValues,
  entryWordCount,
  fieldsFromValues,
  sameValues,
  validateEntry,
  valuesFromEntry,
  wordCount,
} from "../lib/diary";
import { createEntry, deleteEntry, getEntryByDate, updateEntry } from "../lib/diaryDb";
import { parseKey } from "../lib/dates";
import ConfirmDialog from "./ConfirmDialog";
import { ChevronLeftIcon, PenIcon, TrashIcon } from "./Icons";
import MoodPicker from "./MoodPicker";
import WritingAssistant from "./WritingAssistant";
import WordGoal from "./WordGoal";

const longDate = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted";
const areaCls =
  "paper block w-full resize-y rounded-2xl border px-4 py-3 text-[15px] leading-7 text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15";
const btn =
  "min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";
const primary =
  "min-h-11 cursor-pointer rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60";

const Chip = ({ children, tone }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{children}</span>
);

/**
 * Writes or edits the one diary entry for `date`. If the date already has an entry it opens
 * for editing, so there is never a second one. Leaving with unsaved writing asks first.
 */
const DiaryEditor = ({ date, todayKey, userId, diary }) => {
  const navigate = useNavigate();

  const [loadState, setLoadState] = useState({ status: "loading", error: "" });
  const [retry, setRetry] = useState(0);
  const [entry, setEntry] = useState(null);
  const [values, setValues] = useState(blankValues);
  const [baseline, setBaseline] = useState(blankValues);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const journalRef = useRef(null);
  const formRef = useRef(null);
  const allowLeave = useRef(false); // set just before a navigation we cause ourselves (after deleting)

  // ---- load the entry for this date (the page is keyed by date, so each date loads fresh)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getEntryByDate(date);
        if (cancelled) return;
        const v = found ? valuesFromEntry(found) : blankValues();
        setEntry(found);
        setValues(v);
        setBaseline(v);
        setLoadState({ status: "ready", error: "" });
      } catch (e) {
        if (!cancelled) setLoadState({ status: "error", error: e.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, retry]);

  const ready = loadState.status === "ready";
  const dirty = ready && !sameValues(values, baseline);

  // ---- never lose writing by accident: tab close / refresh, in-app links, and the Back button
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // ---- the journal grows with the text
  useLayoutEffect(() => {
    const el = journalRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 352)}px`;
  }, [values.content, ready]);

  const set = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (problem) setProblem(null);
  };

  const trackSelection = () => {
    const el = journalRef.current;
    if (el) setSelection({ start: el.selectionStart, end: el.selectionEnd });
  };

  // ---- hooks for the writing assistant: it may only change the journal when told to
  const replaceRange = (range, expected, replacement) => {
    if (values.content.slice(range.start, range.end) !== expected) return false;
    setValues((v) => ({ ...v, content: v.content.slice(0, range.start) + replacement + v.content.slice(range.end) }));
    setSelection({ start: 0, end: 0 });
    return true;
  };
  const restoreContent = (previous) => {
    set("content", previous);
    setSelection({ start: 0, end: 0 });
  };

  // ---- save
  const save = async (isDraft, { overwrite = false } = {}) => {
    if (saving || !ready) return;
    const found = validateEntry(values, date, todayKey, isDraft);
    setErrors(found);
    setProblem(null);
    const first = ["date", "title", "content", ...REFLECTIONS.map((r) => r.key)].find((k) => found[k]);
    if (first) {
      formRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
      return;
    }

    setSaving(true);
    const savedValues = values; // what is being saved, in case typing continues meanwhile
    try {
      const fields = fieldsFromValues(savedValues, isDraft);
      // "Save my version over it": look at what is stored right now, then replace exactly that
      const base = overwrite ? await getEntryByDate(date) : entry;
      const saved = base
        ? await updateEntry(base.id, base.updatedAt, fields)
        : await createEntry(userId, date, fields);
      setEntry(saved);
      setBaseline(savedValues);
      diary.upsert(saved);
      toast.success(isDraft ? "Draft saved" : "Diary entry saved");
    } catch (e) {
      setProblem({ message: e.message, code: e.code });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setSaving(true);
    try {
      await deleteEntry(entry.id);
      diary.remove(entry.date);
      toast.success("Entry deleted");
      allowLeave.current = true;
      navigate("/diary", { replace: true });
    } catch (e) {
      setProblem({ message: e.message, code: e.code });
      setConfirmDelete(false);
      setSaving(false);
    }
  };

  // ---- loading and error states
  if (loadState.status === "loading")
    return (
      <div className="mx-auto max-w-3xl space-y-4" role="status" aria-label="Loading your entry">
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );

  if (loadState.status === "error")
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-line px-6 py-14 text-center" role="alert">
        <p className="font-display text-3xl">This entry didn&apos;t load</p>
        <p className="mt-2 text-sm text-muted">{loadState.error || "Check your connection and try again."}</p>
        <button
          type="button"
          onClick={() => {
            setLoadState({ status: "loading", error: "" });
            setRetry((n) => n + 1);
          }}
          className={`${primary} mt-6`}
        >
          Try again
        </button>
      </div>
    );

  const journalWords = wordCount(values.content);
  const totalWords = entryWordCount(values);

  return (
    <div className="rise-in mx-auto max-w-3xl xl:mx-0 xl:grid xl:max-w-none xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start xl:gap-8">
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        noValidate
        aria-label="Diary entry"
        className="min-w-0"
      >
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/diary" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink">
            <ChevronLeftIcon width={18} height={18} aria-hidden="true" /> Diary
          </Link>
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            {!entry && <Chip tone="bg-surface-2 text-muted">New entry</Chip>}
            {entry?.isDraft && <Chip tone="bg-diary-soft text-diary">Draft</Chip>}
            {entry && !entry.isDraft && !dirty && <Chip tone="bg-accent-soft text-accent">Saved</Chip>}
            {dirty && <Chip tone="bg-goal-soft text-goal">Unsaved changes</Chip>}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="diary-date" className={labelCls}>
            Date
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="diary-date"
              data-field="date"
              type="date"
              value={date}
              max={todayKey}
              onChange={(e) => e.target.value && navigate(`/diary/${e.target.value}`)}
              aria-invalid={errors.date ? "true" : undefined}
              aria-describedby="diary-date-text"
              className="min-h-11 rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
            <span id="diary-date-text" className="text-sm text-muted">
              {longDate.format(parseKey(date))}
              {date === todayKey ? " · today" : ""}
            </span>
          </div>
          {errors.date && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {errors.date}
            </p>
          )}
          {entry && (
            <p className="mt-1.5 text-xs text-muted">
              You already have an entry for this date, so you are editing it. There is only ever one per day.
            </p>
          )}
        </div>

        {/* title */}
        <div className="mt-6">
          <label htmlFor="diary-title" className={labelCls}>
            Title <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="diary-title"
            data-field="title"
            type="text"
            value={values.title}
            maxLength={200}
            autoComplete="off"
            onChange={(e) => set("title", e.target.value)}
            placeholder="A short title for the day"
            className={`${areaCls} font-display text-2xl leading-snug sm:text-3xl ${errors.title ? "border-danger" : "border-line"}`}
          />
        </div>

        <div className="mt-6">
          <MoodPicker value={values.mood} onChange={(m) => set("mood", m)} />
        </div>

        {/* the journal */}
        <div className="mt-6">
          <label htmlFor="diary-journal" className={labelCls}>
            Daily journal
          </label>
          <textarea
            id="diary-journal"
            data-field="content"
            ref={journalRef}
            value={values.content}
            onChange={(e) => {
              set("content", e.target.value);
              trackSelection();
            }}
            onSelect={trackSelection}
            onKeyUp={trackSelection}
            onMouseUp={trackSelection}
            aria-invalid={errors.content ? "true" : undefined}
            aria-describedby={errors.content ? "diary-journal-error diary-journal-count" : "diary-journal-count"}
            placeholder="Write about your day. There are no rules. Just start."
            className={`${areaCls} min-h-[18rem] px-5 py-4 text-base leading-8 sm:min-h-[22rem] sm:px-7 sm:py-6 ${errors.content ? "border-danger" : "border-line"}`}
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <p id="diary-journal-count" className="text-xs text-muted">
              {journalWords.toLocaleString()} {journalWords === 1 ? "word" : "words"} in your journal
              {totalWords !== journalWords && <> · {totalWords.toLocaleString()} in total</>}
            </p>
            {errors.content && (
              <p id="diary-journal-error" role="alert" className="text-xs text-danger">
                {errors.content}
              </p>
            )}
          </div>
        </div>

        <WordGoal words={totalWords} />

        {/* reflection (all optional) */}
        <fieldset className="mt-8">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Reflect <span className="font-normal normal-case tracking-normal">(all optional)</span>
          </legend>
          <div className="grid gap-5 md:grid-cols-2">
            {REFLECTIONS.map((r) => (
              <div key={r.key}>
                <label htmlFor={`diary-${r.key}`} className="mb-1 block text-sm font-medium">
                  {r.label}
                </label>
                <textarea
                  id={`diary-${r.key}`}
                  data-field={r.key}
                  value={values[r.key]}
                  rows={4}
                  onChange={(e) => set(r.key, e.target.value)}
                  placeholder={r.hint}
                  className={`${areaCls} text-sm leading-6 ${errors[r.key] ? "border-danger" : "border-line"}`}
                />
                {errors[r.key] && (
                  <p role="alert" className="mt-1 text-xs text-danger">
                    {errors[r.key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        {problem && (
          <div role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            <p>{problem.message}</p>
            {(problem.code === "exists" || problem.code === "conflict") && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => save(entry?.isDraft ?? false, { overwrite: true })} disabled={saving} className={btn}>
                  Save my version over it
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoadState({ status: "loading", error: "" });
                    setProblem(null);
                    setRetry((n) => n + 1);
                  }}
                  className={btn}
                >
                  Discard mine and load the saved one
                </button>
              </div>
            )}
          </div>
        )}

        {/* actions */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8 lg:mx-0 lg:rounded-b-none lg:px-0">
          <div>
            {entry && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                <TrashIcon width={16} height={16} aria-hidden="true" /> Delete
              </button>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
            <button type="button" onClick={() => save(true)} disabled={saving} className={btn}>
              {saving ? "Saving…" : entry && !entry.isDraft ? "Save as draft" : "Save draft"}
            </button>
            <button type="submit" disabled={saving} className={`${primary} inline-flex items-center gap-2`}>
              <PenIcon width={16} height={16} aria-hidden="true" /> {saving ? "Saving…" : "Save entry"}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-10 xl:sticky xl:top-20 xl:mt-0 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
        <WritingAssistant
          content={values.content}
          selection={selection}
          onReplace={replaceRange}
          onRestore={restoreContent}
        />
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Leave without saving?"
        confirmLabel="Discard and leave"
        cancelLabel="Keep writing"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        You have writing that isn&apos;t saved yet. If you leave now it will be lost.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this entry?"
        confirmLabel="Delete entry"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        This permanently deletes your diary entry for {longDate.format(parseKey(date))}. It can&apos;t be undone.
      </ConfirmDialog>
    </div>
  );
};

export default DiaryEditor;
