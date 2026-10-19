import toast from "react-hot-toast";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import AppShell from "../components/AppShell";
import DiaryEditor from "../components/DiaryEditor";
import DiaryHistory from "../components/DiaryHistory";
import { PenIcon } from "../components/Icons";
import MiniCalendar from "../components/MiniCalendar";
import WritingProgress from "../components/WritingProgress";
import useDiaryStats from "../hooks/useDiaryStats";
import useNow from "../hooks/useNow";
import { mondayOf, parseKey, toKey } from "../lib/dates";
import { isValidDateKey } from "../lib/diary";

const todayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

const cta =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90";

const DiaryPage = () => {
  const { user } = useAuth();
  const now = useNow();
  const todayKey = toKey(now);
  const { date } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const diary = useDiaryStats(user.id, todayKey);

  // a mistyped or future date in the address bar goes somewhere sensible instead of failing
  if (date && !isValidDateKey(date)) return <Navigate to="/diary" replace />;
  if (date && date > todayKey) return <Navigate to={`/diary/${todayKey}`} replace />;

  const editing = Boolean(date);
  const tab = params.get("tab") === "progress" ? "progress" : "entries";
  const todayRow = diary.byDate.get(todayKey);
  const ctaLabel = !todayRow ? "Write today's diary" : todayRow.draft ? "Continue today's draft" : "Open today's entry";

  const pickDay = (day) => {
    const key = toKey(day);
    if (key > todayKey) return toast.error("You can't write a diary entry for a future date.");
    navigate(`/diary/${key}`);
  };

  return (
    <AppShell>
      <div className="app-grid lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside
          className={`no-print border-b border-line px-4 py-6 sm:px-8 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:py-8 ${
            editing ? "hidden" : ""
          }`}
        >
          <p className="font-display text-3xl leading-tight">{todayFmt.format(now)}</p>
          <Link to={`/diary/${todayKey}`} className={`${cta} mt-4 w-full justify-center`}>
            <PenIcon width={16} height={16} aria-hidden="true" /> {ctaLabel}
          </Link>

          <div className="mt-8">
            <MiniCalendar
              key={date || todayKey}
              monday={mondayOf(parseKey(date || todayKey))}
              todayKey={todayKey}
              onPick={pickDay}
              diaryDays={diary.byDate}
            />
            <p className="mt-2 text-xs text-muted">Pick a day to read or write its entry.</p>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Streak</dt>
              <dd className="mt-1 font-display text-3xl leading-none tabular-nums">
                {diary.stats.streak}
                <span className="ml-1 font-sans text-xs text-muted">{diary.stats.streak === 1 ? "day" : "days"}</span>
              </dd>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Entries</dt>
              <dd className="mt-1 font-display text-3xl leading-none tabular-nums">{diary.stats.entries}</dd>
            </div>
          </dl>
        </aside>

        <main className="main-pane min-w-0 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
          {editing ? (
            <DiaryEditor key={date} date={date} todayKey={todayKey} userId={user.id} diary={diary} />
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Your private journal</p>
                  <h2 className="font-display text-5xl leading-tight tracking-tight sm:text-6xl">Diary</h2>
                </div>
                <Link to={`/diary/${todayKey}`} className={cta}>
                  <PenIcon width={16} height={16} aria-hidden="true" /> {ctaLabel}
                </Link>
              </div>

              <div role="tablist" aria-label="Diary sections" className="mt-10 flex gap-1 border-b border-line">
                {[
                  { id: "entries", label: "Entries" },
                  { id: "progress", label: "Writing progress" },
                ].map((t) => (
                  <button
                    key={t.id}
                    id={`tab-${t.id}`}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    aria-controls="diary-panel"
                    onClick={() => setParams(t.id === "entries" ? {} : { tab: t.id }, { replace: true })}
                    className={`-mb-px min-h-11 cursor-pointer border-b-2 px-4 text-sm font-medium transition-colors ${
                      tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div id="diary-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6">
                {tab === "entries" ? (
                  <DiaryHistory
                    todayKey={todayKey}
                    totalEntries={diary.rows.length}
                    totalKnown={diary.status === "ready"}
                    onWrite={() => navigate(`/diary/${todayKey}`)}
                  />
                ) : (
                  <WritingProgress stats={diary.stats} status={diary.status} onRetry={diary.reload} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
};

export default DiaryPage;
