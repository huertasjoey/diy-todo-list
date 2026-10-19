import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MOODS, moodLabel } from "../lib/diary";
import { listEntries } from "../lib/diaryDb";
import { parseKey } from "../lib/dates";
import { BookIcon, PenIcon } from "./Icons";

const PAGE = 30;
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

const field =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15";
const lab = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted";

/** Past entries, newest first, with search, a date range and a mood filter. */
const DiaryHistory = ({ todayKey, totalEntries, totalKnown, onWrite }) => {
  const [search, setSearch] = useState("");
  // both boxes start as today's date, so the list opens on today. "Show all entries" clears them.
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [mood, setMood] = useState("");
  const [debounced, setDebounced] = useState("");

  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const latest = useRef(0);

  // typing in the search box waits a moment before asking the database
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const applied = useMemo(() => ({ search: debounced, from, to, mood }), [debounced, from, to, mood]);
  const change = (setter) => (e) => {
    setter(e.target.value);
    setStatus("loading");
  };

  const rangeBackwards = Boolean(from && to && from > to);

  useEffect(() => {
    if (rangeBackwards) return;
    const mine = ++latest.current; // an older, slower request must never overwrite a newer one
    (async () => {
      try {
        const rows = await listEntries({ ...applied, limit: PAGE, offset: 0 });
        if (mine !== latest.current) return;
        setEntries(rows);
        setHasMore(rows.length === PAGE);
        setStatus("ready");
      } catch (e) {
        if (mine !== latest.current) return;
        setError(e.message);
        setStatus("error");
      }
    })();
  }, [applied, retry, rangeBackwards]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const rows = await listEntries({ ...applied, limit: PAGE, offset: entries.length });
      setEntries((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      setError(e.message);
      setStatus("error");
    } finally {
      setLoadingMore(false);
    }
  };

  const filtering = Boolean(applied.search.trim() || applied.from || applied.to || applied.mood);
  // exactly the opening view: only the two date boxes, both on today
  const onToday = !applied.search.trim() && !applied.mood && applied.from === todayKey && applied.to === todayKey;
  const diaryIsEmpty = Boolean(totalKnown) && totalEntries === 0;
  // an empty opening view can mean "nothing today" or "a brand-new diary": wait until we know which
  const waitingForTotals = status === "ready" && entries.length === 0 && onToday && !totalKnown;
  const clear = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setMood("");
    setDebounced("");
    setStatus("loading");
  };

  return (
    <section aria-labelledby="history-heading">
      <h3 id="history-heading" className="sr-only">
        Diary history
      </h3>

      <form
        role="search"
        aria-label="Search your diary"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]"
      >
        <div>
          <label htmlFor="diary-search" className={lab}>
            Search
          </label>
          <input
            id="diary-search"
            type="search"
            value={search}
            onChange={change(setSearch)}
            placeholder="Words in a title or entry"
            autoComplete="off"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="diary-from" className={lab}>
            From
          </label>
          <input id="diary-from" type="date" value={from} max={to || todayKey} onChange={change(setFrom)} className={field} />
        </div>
        <div>
          <label htmlFor="diary-to" className={lab}>
            To
          </label>
          <input id="diary-to" type="date" value={to} min={from || undefined} max={todayKey} onChange={change(setTo)} className={field} />
        </div>
        <div>
          <label htmlFor="diary-mood" className={lab}>
            Mood
          </label>
          <select id="diary-mood" value={mood} onChange={change(setMood)} className={field}>
            <option value="">Any mood</option>
            {MOODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {rangeBackwards && (
        <p role="alert" className="mt-3 text-sm text-danger">
          The “From” date is after the “To” date. Swap them to see entries.
        </p>
      )}
      {filtering && (
        <p className="mt-3 text-sm text-muted">
          {onToday ? "Showing today's entry." : "Showing matching entries."}{" "}
          <button type="button" onClick={clear} className="cursor-pointer font-medium text-accent underline underline-offset-2">
            {onToday ? "Show all entries" : "Clear filters"}
          </button>
        </p>
      )}

      <div className="mt-5" aria-live="polite" aria-busy={status === "loading"}>
        {(status === "loading" || waitingForTotals) && !rangeBackwards && (
          <div className="space-y-3" role="status" aria-label="Loading entries">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center" role="alert">
            <p className="font-display text-2xl">Entries didn&apos;t load</p>
            <p className="mt-1 text-sm text-muted">{error || "Check your connection and try again."}</p>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setRetry((n) => n + 1);
              }}
              className="mt-4 min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && entries.length === 0 && !rangeBackwards && diaryIsEmpty && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-diary-soft text-diary">
              <BookIcon width={22} height={22} aria-hidden="true" />
            </span>
            <p className="font-display text-2xl">Your diary is empty</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Write a few lines about your day. It takes a minute, and it&apos;s private to you.
            </p>
            <button
              type="button"
              onClick={onWrite}
              className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
            >
              <PenIcon width={16} height={16} aria-hidden="true" /> Write your first entry
            </button>
          </div>
        )}

        {status === "ready" && entries.length === 0 && onToday && !rangeBackwards && totalKnown && !diaryIsEmpty && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="font-display text-2xl">Nothing written today yet</p>
            <p className="mt-1 text-sm text-muted">Your earlier entries are one click away.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={onWrite}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                <PenIcon width={16} height={16} aria-hidden="true" /> Write today&apos;s diary
              </button>
              <button type="button" onClick={clear} className="min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2">
                Show all entries
              </button>
            </div>
          </div>
        )}

        {status === "ready" && entries.length === 0 && filtering && !onToday && !rangeBackwards && !diaryIsEmpty && (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="font-display text-2xl">No entries match</p>
            <p className="mt-1 text-sm text-muted">Try different words or a wider date range.</p>
            <button type="button" onClick={clear} className="mt-4 min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2">
              Clear filters
            </button>
          </div>
        )}

        {status === "ready" && entries.length > 0 && (
          <>
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/diary/${e.date}`}
                    className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-surface-2 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <time dateTime={e.date} className="text-sm font-semibold">
                        {dayFmt.format(parseKey(e.date))}
                      </time>
                      {e.isDraft && <span className="rounded-full bg-diary-soft px-2.5 py-0.5 text-[11px] font-semibold text-diary">Draft</span>}
                      {e.mood && <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-muted">{moodLabel(e.mood)}</span>}
                      <span className="ml-auto text-xs tabular-nums text-muted">
                        {e.wordCount.toLocaleString()} {e.wordCount === 1 ? "word" : "words"}
                      </span>
                    </div>
                    <p className="mt-1 font-display text-xl leading-snug">{e.title || "Untitled entry"}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{e.preview || "No journal text yet."}</p>
                  </Link>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="min-h-11 cursor-pointer rounded-full border border-line px-6 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load older entries"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default DiaryHistory;
