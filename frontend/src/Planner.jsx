import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import AppShell from "./components/AppShell";
import ConfirmDialog from "./components/ConfirmDialog";
import GoalModal from "./components/GoalModal";
import GoalsPanel from "./components/GoalsPanel";
import { ChevronLeftIcon, ChevronRightIcon } from "./components/Icons";
import Notes from "./components/Notes";
import Sidebar from "./components/Sidebar";
import TaskTable from "./components/TaskTable";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useDiaryStats from "./hooks/useDiaryStats";
import useGoals from "./hooks/useGoals";
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
import { weekLanes } from "./lib/goals";

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
  // null = closed, {} = adding a goal, { goal } = viewing/editing one
  const [goalModal, setGoalModal] = useState(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const weekKey = toKey(monday);
  const week = useWeek(weekKey, user.id);
  const goals = useGoals(user.id);

  const todayKey = toKey(now);
  // diary entries are drawn on the calendars too (a marker per day that has one)
  const diary = useDiaryStats(user.id, todayKey);
  const openDiary = (date) => navigate(`/diary/${date}`);
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

  // Save anything still waiting before the session ends, otherwise those edits would be rejected.
  const handleSignOut = async () => {
    await week.flush();
    await signOut();
  };

  return (
    <AppShell onSignOut={handleSignOut}>
      <div className="app-grid lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Sidebar
          now={now}
          monday={monday}
          stats={stats}
          ready={week.ready}
          goals={goals.goals}
          diaryDays={diary.byDate}
          onPick={(day) => setMonday(mondayOf(day))}
          onPrint={() => window.print()}
          onCsv={exportCsv}
          onReset={() => setConfirmReset(true)}
        />

        <main className="main-pane min-w-0 px-4 py-6 sm:px-8 lg:px-12 lg:py-10" aria-busy={status === "loading"}>
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
                diaryDays={diary.byDate}
                onOpenDiary={openDiary}
                goalLanes={goalLanes}
                todayKey={todayKey}
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
