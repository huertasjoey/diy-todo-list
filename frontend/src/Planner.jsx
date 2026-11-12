import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import AppShell from "./components/AppShell";
import ConfirmDialog from "./components/ConfirmDialog";
import DayPlan from "./components/DayPlan";
import GoalModal from "./components/GoalModal";
import GoalsPanel from "./components/GoalsPanel";
import HabitRenewals from "./components/HabitRenewals";
import { ChevronLeftIcon, ChevronRightIcon } from "./components/Icons";
import MonthView from "./components/MonthView";
import Notes from "./components/Notes";
import Sidebar from "./components/Sidebar";
import TaskTable from "./components/TaskTable";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useDayTasks from "./hooks/useDayTasks";
import useDiaryStats from "./hooks/useDiaryStats";
import useGoals from "./hooks/useGoals";
import useHabitRenewals from "./hooks/useHabitRenewals";
import useNow from "./hooks/useNow";
import useRestDays from "./hooks/useRestDays";
import useWeek from "./hooks/useWeek";
import { buildCsv, downloadCsv } from "./lib/csv";
import {
  addDays,
  formatLongRange,
  formatRange,
  formatYear,
  isoWeek,
  mondayOf,
  parseKey,
  toKey,
  weekDates,
} from "./lib/dates";
import { weekLanes } from "./lib/goals";

const navBtn =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-2";

/** The page title for the week or month, with the Week | Month switch and previous / today / next. */
const PageHeader = ({ eyebrow, title, status, view, onView, unit, onPrev, onNext, onToday, atToday }) => (
  <header className="no-print mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
    <div className="min-w-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1.5 text-3xl font-semibold leading-tight tracking-tight sm:text-[2.25rem]">{title}</h2>
      {status !== undefined && (
        <p className="mt-2 flex min-h-5 items-center gap-2 text-xs text-muted" aria-live="polite">
          {status}
        </p>
      )}
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Planner view" className="inline-flex rounded-lg bg-surface-2 p-1">
        {["week", "month"].map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => onView(v)}
            className={`min-h-8 min-w-18 cursor-pointer rounded-md px-3 text-sm font-medium capitalize transition-colors ${
              view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="inline-flex items-center rounded-lg bg-surface p-0.5 shadow-[0_0_0_1px_var(--line)]">
        <button type="button" className={navBtn} onClick={onPrev} aria-label={`Previous ${unit}`}>
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className="min-h-9 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors hover:bg-surface-2 disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
          onClick={onToday}
          disabled={atToday}
        >
          Today
        </button>
        <button type="button" className={navBtn} onClick={onNext} aria-label={`Next ${unit}`}>
          <ChevronRightIcon width={18} height={18} />
        </button>
      </div>
    </div>
  </header>
);

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
  // null = closed, {} = adding a goal, { goal } = viewing/editing one
  const [goalModal, setGoalModal] = useState(null);
  const [view, setView] = useState("week"); // "week" | "month"
  const [monthStart, setMonthStart] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const weekKey = toKey(monday);
  const week = useWeek(weekKey, user.id);
  const goals = useGoals(user.id);
  const restDays = useRestDays(user.id);

  const todayKey = toKey(now);
  // diary entries are drawn on the calendars too (a marker per day that has one)
  const diary = useDiaryStats(user.id, todayKey);
  // today's tasks and the optional list for tomorrow (tasks belong to dates, so tomorrow's becomes today's)
  const plan = useDayTasks(user.id, todayKey);
  const openDiary = (date) => navigate(`/diary/${date}`);
  const thisMonday = toKey(mondayOf(now));
  const dates = useMemo(() => weekDates(monday), [monday]);
  const todayIndex = weekKey === thisMonday ? dates.findIndex((d) => toKey(d) === todayKey) : -1;

  // Habits last a month; last month's wait here until they're continued or stopped.
  // A continued habit is written into this month's weeks, so both views reload to show it.
  const [monthReloads, setMonthReloads] = useState(0);
  const retryWeekLoad = week.retryLoad;
  const renewals = useHabitRenewals(
    user.id,
    thisMonday,
    useCallback(() => {
      retryWeekLoad();
      setMonthReloads((n) => n + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // If you're looking at the current week when it rolls over (Monday 00:00), move on with the calendar.
  const lastThisMonday = useRef(thisMonday);
  useEffect(() => {
    const previous = lastThisMonday.current;
    if (previous === thisMonday) return;
    lastThisMonday.current = thisMonday;
    setMonday((m) => (toKey(m) === previous ? parseKey(thisMonday) : m));
  }, [thisMonday]);

  // Progress counts only rows that have a habit written on them, and skips rest days.
  const stats = useMemo(() => {
    const real = week.tasks.filter((t) => t.text.trim());
    // a day doesn't count for a habit when it's a rest day for everyone or just for that habit
    const on = (t, i) => !restDays.isOff(toKey(dates[i]), t.text);
    const total = real.reduce((n, t) => n + t.days.filter((_, i) => on(t, i)).length, 0);
    const checked = real.reduce((n, t) => n + t.days.filter((v, i) => v && on(t, i)).length, 0);
    return {
      habits: real.length,
      checked,
      total,
      percent: total ? Math.round((checked / total) * 100) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week.tasks, dates, restDays.rest, restDays.cells]);

  const goToMonth = (offset) => setMonthStart((m) => new Date(m.getFullYear(), m.getMonth() + offset, 1));
  const showView = async (next) => {
    if (next === view) return;
    // anything still waiting to save (a habit just removed, say) goes out before the month reads it
    if (next === "month") await week.flush();
    setView(next);
    // the month view writes marks directly, so the week reloads to show them
    if (next === "week") week.retryLoad();
  };
  const goToWeek = (offsetWeeks) => setMonday((m) => addDays(m, offsetWeeks * 7));
  const exportCsv = () =>
    downloadCsv(`habits-${weekKey}.csv`, buildCsv(week.tasks, week.notes));

  const status = week.status;

  // Goals for this week, laid out as calendar bars (overlapping goals get their own rows)
  const goalLanes = useMemo(() => weekLanes(goals.goals, monday), [goals.goals, monday]);

  // Each handler resolves to an error message, or null on success (the modal shows failures inline)
  const saveGoal = async (values, newId) => {
    const editing = goalModal?.goal;
    try {
      if (editing) await goals.update(editing.id, values);
      else await goals.create(values, newId);
      toast.success(editing ? "Goal updated" : "Goal added");
      setGoalModal(null);
      return null;
    } catch (e) {
      toast.error(e.message);
      return e.message;
    }
  };

  const deleteGoal = async () => {
    try {
      await goals.remove(goalModal.goal.id);
      toast.success("Goal deleted");
      setGoalModal(null);
      return null;
    } catch (e) {
      toast.error(e.message);
      return e.message;
    }
  };

  // A deleted habit can be brought back, marks and all, from the toast.
  // (the toast outlives this render, so it reads the week as it is when Restore is clicked)
  const weekKeyRef = useRef(weekKey);
  const tasksRef = useRef(week.tasks);
  weekKeyRef.current = weekKey;
  tasksRef.current = week.tasks;
  const deleteHabit = (id) => {
    const deleted = week.deleteTask(id);
    if (!deleted) return;
    const name = deleted.task.text.trim() || "Habit";
    toast(
      (t) => (
        <span className="flex items-center gap-3">
          <span className="min-w-0 truncate">“{name}” deleted</span>
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              const same = (x) => x.text.trim().toLowerCase() === name.toLowerCase();
              if (deleted.weekKey === weekKeyRef.current && tasksRef.current.some(same))
                return toast.error(`“${name}” is already listed, so it wasn't restored.`);
              week.restoreTask(deleted);
              toast.success("Habit restored");
            }}
            className="shrink-0 cursor-pointer rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-ink hover:opacity-90"
          >
            Restore
          </button>
        </span>
      ),
      { duration: 8000 },
    );
  };

  // Save anything still waiting before the session ends, otherwise those edits would be rejected.
  const handleSignOut = async () => {
    await week.flush();
    await signOut();
  };

  return (
    <AppShell onSignOut={handleSignOut}>
      <div className="app-grid lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Sidebar
          now={now}
          monday={monday}
          stats={stats}
          ready={week.ready}
          goals={goals.goals}
          diaryDays={diary.byDate}
          onPick={(day) => {
            setMonday(mondayOf(day));
            setMonthStart(new Date(day.getFullYear(), day.getMonth(), 1));
          }}
          onPrint={() => window.print()}
          onCsv={exportCsv}
          onReset={() => setConfirmReset(true)}
        />

        <main className="main-pane min-w-0 px-4 py-6 sm:px-8 lg:px-8 lg:py-10 xl:px-12" aria-busy={status === "loading"}>
          {/* Printed heading (the on-screen one is the top bar and week header) */}
          <div className="print-only mb-3">
            <p className="text-center font-display text-[40px] uppercase leading-none tracking-wide">
              Kaizen
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

          <div className="mx-auto max-w-[70rem]">
          <HabitRenewals renewals={renewals} thisMonday={thisMonday} />

          {view === "month" ? (
            <div className="no-print">
              <PageHeader
                eyebrow={String(monthStart.getFullYear())}
                title={new Intl.DateTimeFormat(undefined, { month: "long" }).format(monthStart)}
                view={view}
                onView={showView}
                unit="month"
                onPrev={() => goToMonth(-1)}
                onNext={() => goToMonth(1)}
                onToday={() => setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1))}
                atToday={monthStart.getFullYear() === now.getFullYear() && monthStart.getMonth() === now.getMonth()}
              />
              <MonthView key={`${toKey(monthStart)}-${monthReloads}`} monthStart={monthStart} userId={user.id} todayKey={todayKey} restDays={restDays} />
            </div>
          ) : (
            <>
          <PageHeader
            eyebrow={`Week ${isoWeek(monday)} · ${formatYear(monday)}${weekKey === thisMonday ? " · This week" : ""}`}
            title={formatLongRange(monday)}
            status={
              status === "saveError" ? (
                <>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-danger" />
                  Not saved yet.{" "}
                  <button
                    type="button"
                    onClick={week.retrySave}
                    className="cursor-pointer font-semibold text-accent underline underline-offset-2"
                  >
                    Retry
                  </button>
                </>
              ) : STATUS_TEXT[status] ? (
                <>
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${status === "saved" ? "bg-accent" : "animate-pulse bg-muted"}`}
                  />
                  {STATUS_TEXT[status]}
                </>
              ) : null
            }
            view={view}
            onView={showView}
            unit="week"
            onPrev={() => goToWeek(-1)}
            onNext={() => goToWeek(1)}
            onToday={() => setMonday(mondayOf(now))}
            atToday={weekKey === thisMonday}
          />

          <DayPlan plan={plan} />

          {status === "loadError" ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center" role="alert">
              <p className="text-lg font-semibold">This week didn’t load</p>
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
                onDelete={deleteHabit}
                onAdd={week.addTask}
                diaryDays={diary.byDate}
                onOpenDiary={openDiary}
                goalLanes={goalLanes}
                todayKey={todayKey}
                restDays={restDays}
                stats={stats}
                onOpenGoal={(goal) => setGoalModal({ goal })}
              />
              <GoalsPanel
                goals={goals.goals}
                status={goals.status}
                error={goals.error}
                todayKey={todayKey}
                onAdd={() => setGoalModal({})}
                onOpen={(goal) => setGoalModal({ goal })}
                onRetry={goals.retry}
              />
              <Notes value={week.notes} onChange={week.setNotes} disabled={!week.ready} />
            </div>
          )}
            </>
          )}
          </div>
        </main>
      </div>

      {goalModal && (
        <GoalModal
          key={goalModal.goal?.id ?? "new"}
          goal={goalModal.goal}
          todayKey={todayKey}
          onSave={saveGoal}
          onDelete={deleteGoal}
          onClose={() => setGoalModal(null)}
        />
      )}

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
    </AppShell>
  );
};

export default Planner;
