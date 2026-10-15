import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import AccountMenu from "./components/AccountMenu";
import ConfirmDialog from "./components/ConfirmDialog";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "./components/Icons";
import Notes from "./components/Notes";
import Sidebar from "./components/Sidebar";
import TaskTable from "./components/TaskTable";
import ThemeSwitcher from "./components/ThemeSwitcher";
import useNow from "./hooks/useNow";
import useWeek from "./hooks/useWeek";
import { buildCsv, downloadCsv } from "./lib/csv";
import {
  addDays,
  formatRange,
  formatYear,
  mondayOf,
  parseKey,
  toKey,
  weekDates,
} from "./lib/dates";

const navBtn =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-surface-2";

const STATUS_TEXT = {
  loading: "Loading…",
  saving: "Saving…",
  saved: "All changes saved",
};

const Blank = ({ children }) => (
  <span className="inline-block min-w-40 border-b border-black px-2 pb-0.5 text-center text-[15px]">
    {children}
  </span>
);

const Planner = () => {
  const now = useNow();
  const [monday, setMonday] = useState(() => mondayOf(now));
  const [confirmReset, setConfirmReset] = useState(false);

  const { user, displayName, signOut } = useAuth();
  const weekKey = toKey(monday);
  const week = useWeek(weekKey, user.id);

  const todayKey = toKey(now);
  const thisMonday = toKey(mondayOf(now));
  const dates = useMemo(() => weekDates(monday), [monday]);
  const todayIndex = weekKey === thisMonday ? dates.findIndex((d) => toKey(d) === todayKey) : -1;

  // If you're looking at the current week when it rolls over (Monday 00:00), move on with the calendar.
  const lastThisMonday = useRef(thisMonday);
  useEffect(() => {
    const previous = lastThisMonday.current;
    if (previous === thisMonday) return;
    lastThisMonday.current = thisMonday;
    setMonday((m) => (toKey(m) === previous ? parseKey(thisMonday) : m));
  }, [thisMonday]);

  // Progress counts only rows that have a habit written on them.
  const stats = useMemo(() => {
    const real = week.tasks.filter((t) => t.text.trim());
    const total = real.length * 7;
    const checked = real.reduce((n, t) => n + t.days.filter(Boolean).length, 0);
    return {
      habits: real.length,
      checked,
      total,
      percent: total ? Math.round((checked / total) * 100) : 0,
    };
  }, [week.tasks]);

  const goToWeek = (offsetWeeks) => setMonday((m) => addDays(m, offsetWeeks * 7));
  const exportCsv = () =>
    downloadCsv(`habits-${weekKey}.csv`, buildCsv(week.tasks, week.notes));

  const status = week.status;

  // Save anything still waiting before the session ends, otherwise those edits would be rejected.
  const handleSignOut = async () => {
    await week.flush();
    await signOut();
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Top bar */}
      <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-8">
        <h1 className="flex items-center gap-3 font-display text-2xl leading-none">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink"
          >
            <CheckIcon width={16} height={16} strokeWidth={3} />
          </span>
          Habit Tracker
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />
          <AccountMenu
            user={user}
            displayName={displayName}
            onSignOut={handleSignOut}
          />
        </div>
      </header>

      <div className="app-grid lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Sidebar
          now={now}
          monday={monday}
          stats={stats}
          ready={week.ready}
          onPick={(day) => setMonday(mondayOf(day))}
          onPrint={() => window.print()}
          onCsv={exportCsv}
          onReset={() => setConfirmReset(true)}
        />

        <main className="main-pane min-w-0 px-4 py-6 sm:px-8 lg:px-12 lg:py-10" aria-busy={status === "loading"}>
          {/* Printed heading (the on-screen one is the top bar and week header) */}
          <div className="print-only mb-3">
            <p className="text-center font-display text-[40px] uppercase leading-none tracking-wide">
              Habit Tracker
            </p>
            <div className="mt-3 flex justify-between text-[11px] font-semibold uppercase tracking-[0.14em]">
              <p>
                Week of: <Blank>{formatRange(monday)}</Blank>
              </p>
              <p>
                Year: <Blank>{formatYear(monday)}</Blank>
              </p>
            </div>
          </div>

          {/* Week header */}
          <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                {formatYear(monday)}
              </p>
              <h2 className="font-display text-5xl leading-tight tracking-tight sm:text-6xl">
                {formatRange(monday)}
              </h2>
              <p
                className="mt-1 min-h-5 text-xs text-muted"
                aria-live="polite"
              >
                {status === "saveError" ? (
                  <>
                    Not saved yet.{" "}
                    <button
                      type="button"
                      onClick={week.retrySave}
                      className="cursor-pointer font-semibold text-accent underline underline-offset-2"
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  STATUS_TEXT[status] ?? ""
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={navBtn}
                onClick={() => goToWeek(-1)}
                aria-label="Previous week"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className="min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2 disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
                onClick={() => setMonday(mondayOf(now))}
                disabled={weekKey === thisMonday}
              >
                Today
              </button>
              <button
                type="button"
                className={navBtn}
                onClick={() => goToWeek(1)}
                aria-label="Next week"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          {status === "loadError" ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center" role="alert">
              <p className="font-display text-3xl">This week didn’t load</p>
              <p className="mt-2 text-sm text-muted">
                Your saved habits are safe. Check your connection, then try again.
              </p>
              <button
                type="button"
                onClick={week.retryLoad}
                className="mt-6 min-h-11 cursor-pointer rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className={`transition-opacity ${status === "loading" ? "opacity-50" : ""}`}>
              <TaskTable
                key={weekKey}
                week={week.tasks}
                dates={dates}
                todayIndex={todayIndex}
                ready={week.ready}
                onText={week.setText}
                onToggle={week.toggleDay}
                onClear={week.clearMarks}
                onDelete={week.deleteTask}
                onAdd={week.addTask}
              />
              <Notes value={week.notes} onChange={week.setNotes} disabled={!week.ready} />
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset this week’s marks?"
        confirmLabel="Reset marks"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          week.resetCompletions();
          setConfirmReset(false);
        }}
      >
        Every checked box this week will be cleared. Your habits and notes stay as they are.
      </ConfirmDialog>
    </div>
  );
};

export default Planner;
