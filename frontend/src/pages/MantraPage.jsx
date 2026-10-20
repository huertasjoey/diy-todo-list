import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthProvider";
import AppShell from "../components/AppShell";
import { CheckIcon, PlusIcon, SparklesIcon, TrashIcon, UndoIcon } from "../components/Icons";
import useNow from "../hooks/useNow";
import { toKey } from "../lib/dates";
import {
  MANTRAS,
  MANTRA_MAX_LEN,
  MANTRA_MAX_MINE,
  TARGETS,
  cleanMantra,
  loadMine,
  mantraForDay,
  saveMine,
} from "../lib/mantra";
import { uuid } from "../lib/uuid";

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.16em]";
const btn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-50";

const R = 88;
const CIRC = 2 * Math.PI * R;

const MantraPage = () => {
  const { user } = useAuth();
  const now = useNow();
  const todayKey = toKey(now);

  const [{ mine, pinned }, setState] = useState(() => loadMine(user.id));
  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState(21);
  const [count, setCount] = useState(0);

  // keep the chosen mantra's day in step with the clock; repeating starts over on a new day
  useEffect(() => {
    setOffset(0);
    setCount(0);
  }, [todayKey]);

  const update = (next) => {
    setState(next);
    if (!saveMine(user.id, next)) toast.error("Couldn't save in this browser, so your mantras won't be kept.");
  };

  const pool = useMemo(() => [...MANTRAS, ...mine.map((m) => m.text)], [mine]);
  const pinnedText = mine.find((m) => m.id === pinned)?.text;
  const current = pinnedText && offset === 0 ? pinnedText : mantraForDay(todayKey, pool, offset);

  const done = count >= target;
  const progress = Math.min(count / target, 1);

  const add = (e) => {
    e.preventDefault();
    const text = cleanMantra(draft);
    if (!text) return;
    if (mine.length >= MANTRA_MAX_MINE) return toast.error(`You can keep up to ${MANTRA_MAX_MINE} mantras.`);
    if (mine.some((m) => m.text.toLowerCase() === text.toLowerCase())) return toast.error("You already have that one.");
    update({ mine: [{ id: uuid(), text }, ...mine], pinned });
    setDraft("");
    toast.success("Mantra added");
  };

  const remove = (id) => update({ mine: mine.filter((m) => m.id !== id), pinned: pinned === id ? null : pinned });
  const pin = (id) => {
    setOffset(0);
    update({ mine, pinned: pinned === id ? null : id });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy. Select the text instead.");
    }
  };

  const tap = () => {
    if (done) return;
    const next = count + 1;
    setCount(next);
    if (next === target) toast.success("Well done. Take a breath.");
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="rise-in">
          <p className={`${eyebrow} text-accent`}>{dateFmt.format(now)}</p>
          <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">Mantra</h2>
          <span className="mt-2 block h-px w-16 bg-accent/60" aria-hidden="true" />
        </div>

        {/* today's mantra */}
        <section
          aria-labelledby="mantra-today"
          className="paper rise-in mt-8 rounded-3xl border border-line px-6 py-10 text-center sm:px-12 sm:py-14"
        >
          <h3 id="mantra-today" className={`${eyebrow} flex items-center justify-center gap-2 text-muted`}>
            <SparklesIcon width={14} height={14} /> {pinnedText && offset === 0 ? "Your chosen mantra" : "Today's mantra"}
          </h3>
          <blockquote
            key={current}
            className="rise-in mx-auto mt-5 max-w-xl text-balance break-words font-display text-3xl leading-snug sm:text-5xl"
          >
            “{current}”
          </blockquote>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button type="button" className={btn} onClick={() => setOffset((n) => n + 1)}>
              <UndoIcon width={16} height={16} /> Another
            </button>
            <button type="button" className={btn} onClick={copy}>
              Copy
            </button>
          </div>
        </section>

        {/* repeat it */}
        <section aria-labelledby="mantra-repeat" className="mt-10">
          <h3 id="mantra-repeat" className={`${eyebrow} text-muted`}>
            Repeat it
          </h3>
          <div className="mt-4 flex flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:justify-around sm:p-8">
            <button
              type="button"
              onClick={tap}
              aria-label={done ? "Practice complete" : `Count one repetition. ${count} of ${target} done.`}
              className="group relative flex h-52 w-52 shrink-0 cursor-pointer items-center justify-center rounded-full outline-offset-4 disabled:cursor-default"
              disabled={done}
            >
              <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="6" />
                <circle
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress)}
                  className="transition-[stroke-dashoffset] duration-300 ease-out"
                />
              </svg>
              <span className="relative text-center">
                {done ? (
                  <CheckIcon width={44} height={44} strokeWidth={2.5} className="mx-auto text-accent" />
                ) : (
                  <span className="block font-display text-6xl leading-none tabular-nums">{count}</span>
                )}
                <span className="mt-1 block text-xs text-muted">
                  {done ? "Complete" : `of ${target} · tap`}
                </span>
              </span>
            </button>

            <div className="w-full sm:w-auto">
              <p className={`${eyebrow} mb-2 text-muted`}>Repetitions</p>
              <div role="radiogroup" aria-label="Repetitions" className="flex flex-wrap gap-2">
                {TARGETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={target === n}
                    onClick={() => {
                      setTarget(n);
                      setCount(0);
                    }}
                    className={`min-h-11 min-w-14 cursor-pointer rounded-full border px-4 text-sm font-medium tabular-nums transition-colors ${
                      target === n
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button type="button" className={`${btn} mt-4`} onClick={() => setCount(0)} disabled={count === 0}>
                Start over
              </button>
            </div>
          </div>
        </section>

        {/* their own mantras */}
        <section aria-labelledby="mantra-mine" className="mt-10">
          <h3 id="mantra-mine" className={`${eyebrow} text-muted`}>
            Your mantras
          </h3>
          <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="mantra-new" className="sr-only">
              Write your own mantra
            </label>
            <input
              id="mantra-new"
              type="text"
              value={draft}
              maxLength={MANTRA_MAX_LEN}
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your own mantra"
              className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
            <button
              type="submit"
              disabled={!cleanMantra(draft)}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
            >
              <PlusIcon width={16} height={16} /> Add
            </button>
          </form>

          {mine.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
              Nothing here yet. Add a line that helps you, and it joins the daily rotation.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {mine.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface p-4"
                >
                  <p className="min-w-0 flex-1 basis-56 break-words font-display text-xl leading-snug">{m.text}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => pin(m.id)}
                      aria-pressed={pinned === m.id}
                      className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors ${
                        pinned === m.id ? "bg-accent-soft text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      {pinned === m.id ? "Chosen for today" : "Use today"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      aria-label={`Delete mantra: ${m.text}`}
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-danger transition-colors hover:bg-danger/10"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Saved in this browser only.</p>
        </section>
      </main>
    </AppShell>
  );
};

export default MantraPage;
