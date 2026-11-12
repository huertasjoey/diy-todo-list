import { useState } from "react";
import toast from "react-hot-toast";
import { DAY_NAMES, DAY_SHORT, toKey } from "../lib/dates";
import { STATUS, formatRangeText, goalStatus, percentLabel, progressPercent, progressText } from "../lib/goals";
import CellMenu from "./CellMenu";
import DayBox from "./DayBox";
import { BookIcon, MoonIcon, PlusIcon, TrashIcon, UndoIcon } from "./Icons";

const MIN_VISIBLE = 7; // rows shown on screen at minimum; print always shows them all

const focusTask = (id) =>
  requestAnimationFrame(() => document.getElementById(`task-${id}`)?.focus());

const iconBtn =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-0";

const MAX_LANES = 3; // goal rows shown in the week; the rest are one click away in the Goals list

const TaskTable = ({
  week,
  dates,
  todayIndex,
  ready,
  onText,
  onToggle,
  onClear,
  onDelete,
  onAdd,
  goalLanes = [],
  todayKey,
  onOpenGoal,
  diaryDays = new Map(),
  onOpenDiary,
  restDays = { isRest: () => false, toggle: () => {} },
  stats,
}) => {
  const restFlags = dates.map((d) => restDays.isRest(toKey(d)));
  // right-click (or long-press) on a box: set that one habit's day as a rest day
  const [menu, setMenu] = useState(null);
  // empty rows revealed on top of the default, by Enter or "Add habit"
  const [extra, setExtra] = useState(0);

  const lastUsed = week.reduce(
    (last, t, i) => (t.text.trim() || t.days.some(Boolean) ? i : last),
    -1,
  );
  const visible = Math.min(week.length, Math.max(MIN_VISIBLE, lastUsed + 1) + extra);
  const firstBlank = week.findIndex((t) => !t.text.trim() && !t.days.some(Boolean));

  // A habit written a second time (ignoring case and spaces) is flagged, and named in a toast
  // once the row is left, so the same habit isn't tracked twice.
  const seen = new Map(); // habit -> the first row's index
  const duplicateOf = new Map(); // task id -> row number it repeats
  week.forEach((t, i) => {
    const key = t.text.trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) duplicateOf.set(t.id, seen.get(key) + 1);
    else seen.set(key, i);
  });
  const warnDuplicate = (task) => {
    const row = duplicateOf.get(task.id);
    if (row)
      toast.error(`“${task.text.trim()}” is already listed (row ${row}). Remove one so it isn't tracked twice.`, {
        id: `duplicate-${task.id}`,
      });
  };

  const shownLanes = goalLanes.slice(0, MAX_LANES);
  const hiddenGoals = goalLanes.slice(MAX_LANES).reduce((n, lane) => n + lane.length, 0);

  const handleEnter = (index, id) => {
    const next = week[index + 1];
    if (!next) return focusTask(onAdd(id));
    if (index + 1 >= visible) setExtra((e) => e + 1);
    focusTask(next.id);
  };

  const addHabit = () => {
    if (visible < week.length) {
      setExtra((e) => e + 1);
      focusTask(week[visible].id);
    } else {
      focusTask(onAdd());
    }
  };

  // how much of each day is done, across the habits that have something to tick that day
  const perDay = dates.map((d, i) => {
    const active = week.filter((t) => t.text.trim() && !restFlags[i] && !restDays.isCellRest?.(toKey(d), t.text.trim()));
    return active.length ? active.filter((t) => t.days[i]).length / active.length : null;
  });

  return (
    <section aria-labelledby="habits-heading" className="mt-14">
      <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h3 id="habits-heading" className="font-display text-[2.5rem] leading-none tracking-tight">
          Habits
        </h3>
        {stats?.total > 0 && (
          <p className="flex items-center gap-3 text-sm text-muted">
            <span>
              {stats.checked} of {stats.total} check-ins
            </span>
            <span aria-hidden="true" className="h-1 w-24 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${stats.percent}%` }} />
            </span>
            <span className="font-display text-xl text-ink tabular-nums">{stats.percent}%</span>
          </p>
        )}
      </div>

      <div className="habit-card sheet overflow-hidden">
        <div className="scroll-x relative overflow-x-auto">
          <table className="planner-table w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">
              Weekly habits with one checkbox for each day of the week
            </caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="eyebrow sticky left-0 z-10 w-[36%] min-w-44 bg-surface px-6 pb-4 pt-6 align-bottom">
                  Habit
                </th>
                {DAY_SHORT.map((short, i) => (
                  <th
                    key={short}
                    scope="col"
                    aria-label={`${DAY_NAMES[i]} ${dates[i].getDate()}${i === todayIndex ? ", today" : ""}`}
                    className={`group w-14 min-w-14 px-0 pb-3 pt-5 text-center align-bottom ${
                      i === todayIndex ? "bg-accent-soft/50 text-ink" : ""
                    } ${restFlags[i] ? "rest-day" : ""}`}
                  >
                    <span aria-hidden="true" className="block text-[10px] font-semibold uppercase tracking-[0.18em]">
                      {short}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mx-auto mt-1.5 flex h-9 w-9 items-center justify-center rounded-full font-display text-[1.35rem] leading-none ${
                        i === todayIndex ? "bg-accent text-accent-ink" : "text-ink"
                      }`}
                    >
                      {dates[i].getDate()}
                    </span>
                    {/* that day's share of check-ins done */}
                    <span aria-hidden="true" className="no-print mx-auto mt-2 block h-[3px] w-6 overflow-hidden rounded-full bg-line">
                      {perDay[i] !== null && (
                        <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${perDay[i] * 100}%` }} />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => restDays.toggle(toKey(dates[i]))}
                      aria-pressed={restFlags[i]}
                      aria-label={`${restFlags[i] ? "Unmark" : "Mark"} ${DAY_NAMES[i]} as a rest day`}
                      title={restFlags[i] ? "Rest day (click to undo)" : "Mark as a rest day"}
                      className={`no-print mx-auto mt-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all ${
                        restFlags[i]
                          ? "bg-surface text-goal shadow-sm"
                          : "text-muted/70 hover:bg-surface hover:text-ink focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      }`}
                    >
                      <MoonIcon width={13} height={13} />
                    </button>
                  </th>
                ))}
                <th scope="col" className="eyebrow w-20 px-2 pb-4 text-center align-bottom">
                  Week
                </th>
                <th scope="col" className="no-print w-24">
                  <span className="sr-only">Row actions</span>
                </th>
              </tr>
            </thead>
            {goalLanes.length > 0 && (
              <tbody className="no-print border-b border-line">
                {shownLanes.map((lane, laneIndex) => (
                  <tr key={laneIndex}>
                    <th
                      scope="row"
                      className={`sticky left-0 z-[1] bg-surface px-6 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-goal ${laneIndex === 0 ? "pt-3" : "pt-1"}`}
                    >
                      {laneIndex === 0 ? "Goals" : <span className="sr-only">Goals, row {laneIndex + 1}</span>}
                    </th>
                    {Array.from({ length: 7 }, (_, day) => {
                      const seg = lane.find((x) => x.start === day);
                      if (seg) {
                        const g = seg.goal;
                        const st = goalStatus(g, todayKey);
                        return (
                          <td key={day} colSpan={seg.end - seg.start + 1} className={`px-1 pb-1 ${laneIndex === 0 ? "pt-3" : "pt-1"}`}>
                            <button
                              type="button"
                              onClick={() => onOpenGoal(g)}
                              title={`${g.title}
${formatRangeText(g)}
${progressText(g)}${progressPercent(g) === null ? '' : ` (${progressPercent(g)}%)`}`}
                              aria-label={`Goal: ${g.title}, ${formatRangeText(g)}, ${percentLabel(g)}, ${STATUS[st].label}. Open details`}
                              className={`flex h-7 w-full cursor-pointer items-center gap-2 overflow-hidden px-3 text-left text-xs font-medium text-ink transition-opacity hover:opacity-80 ${STATUS[st].bar.split(" ")[1]} ${
                                seg.clippedLeft ? "rounded-l-none" : "rounded-l-full"
                              } ${seg.clippedRight ? "rounded-r-none" : "rounded-r-full"}`}
                            >
                              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS[st].fill}`} />
                              <span className="truncate">{g.title}</span>
                              {progressPercent(g) !== null && (
                                <span className={`ml-auto shrink-0 tabular-nums ${STATUS[st].text}`}>
                                  {progressPercent(g)}%
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      }
                      const covered = lane.some((x) => x.start < day && x.end >= day);
                      return covered ? null : <td key={day} />;
                    })}
                    <td colSpan={2} />
                  </tr>
                ))}
                {hiddenGoals > 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 pb-3 pt-0.5 text-xs text-muted">
                      <a href="#goals" className="font-medium text-goal underline underline-offset-2">
                        +{hiddenGoals} more {hiddenGoals === 1 ? "goal" : "goals"} this week
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            )}
            {dates.some((d) => diaryDays.has(toKey(d))) && (
              <tbody className="no-print border-b border-line">
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-[1] bg-surface px-6 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-diary"
                  >
                    Diary
                  </th>
                  {dates.map((d, i) => {
                    const entry = diaryDays.get(toKey(d));
                    return (
                      <td key={toKey(d)} className="px-1 py-2.5 text-center">
                        {entry && (
                          <button
                            type="button"
                            onClick={() => onOpenDiary(toKey(d))}
                            title={`${DAY_NAMES[i]}: diary ${entry.draft ? "draft" : "entry"}, ${entry.words} words`}
                            aria-label={`Diary ${entry.draft ? "draft" : "entry"} for ${DAY_NAMES[i]} ${d.getDate()}, ${entry.words} words. Open it`}
                            className={`mx-auto flex h-7 w-full max-w-16 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-full px-1.5 text-[11px] font-medium text-diary transition-opacity hover:opacity-80 ${
                              entry.draft ? "border border-dashed border-diary/60" : "bg-diary-soft"
                            }`}
                          >
                            <BookIcon width={13} height={13} aria-hidden="true" className="shrink-0" />
                            <span className="truncate tabular-nums">{entry.draft ? "Draft" : entry.words}</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td colSpan={2} />
                </tr>
              </tbody>
            )}
            <tbody>
              {week.map((task, index) => {
                const habit = task.text.trim();
                // this habit has nothing to tick on a day that is a rest day, either for everyone or just for it
                const off = task.days.map((_, i) => restFlags[i] || (habit !== "" && restDays.isCellRest(toKey(dates[i]), habit)));
                const activeDays = off.filter((o) => !o).length;
                const done = task.days.filter((v, i) => v && !off[i]).length;
                const finished = habit !== "" && activeDays > 0 && done === activeDays;
                const name = task.text.trim() || `row ${index + 1}`;
                return (
                  <tr
                    key={task.id}
                    className={`task-row group border-t border-line/60 transition-colors first:border-t-0 hover:bg-surface-2/40 ${
                      index >= visible ? "hidden print:table-row" : ""
                    }`}
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] bg-surface p-0 text-left font-normal group-hover:bg-surface-2"
                    >
                      <div className="relative">
                      <input
                        id={`task-${task.id}`}
                        type="text"
                        value={task.text}
                        disabled={!ready}
                        maxLength={300}
                        autoComplete="off"
                        aria-label={`Task ${index + 1}`}
                        placeholder={index === firstBlank ? "Add a habit…" : ""}
                        onChange={(e) => onText(task.id, e.target.value)}
                        onBlur={() => warnDuplicate(task)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            warnDuplicate(task);
                            handleEnter(index, task.id);
                          }
                        }}
                        aria-invalid={duplicateOf.has(task.id) || undefined}
                        aria-describedby={duplicateOf.has(task.id) ? `dup-${task.id}` : undefined}
                        className={`h-14 w-full min-w-44 bg-transparent px-6 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:bg-accent-soft/60 focus-visible:outline-none print:placeholder:text-transparent ${
                          finished ? "text-muted line-through decoration-muted/50" : "text-ink"
                        } ${duplicateOf.has(task.id) ? "pr-32 shadow-[inset_3px_0_0_var(--color-danger)]" : ""}`}
                      />
                      {duplicateOf.has(task.id) && (
                        <span
                          id={`dup-${task.id}`}
                          className="no-print pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger"
                        >
                          Already listed
                        </span>
                      )}
                      </div>
                    </th>
                    {task.days.map((checked, day) => (
                      <td
                        key={day}
                        className={`p-0 text-center ${day === todayIndex ? "bg-accent-soft/35" : ""} ${off[day] ? "rest-day" : ""}`}
                      >
                        <DayBox
                          checked={checked && !off[day]}
                          disabled={!ready || off[day]}
                          off={off[day]}
                          onMenu={
                            habit && !restFlags[day]
                              ? (x, y) => setMenu({ x, y, habit, date: toKey(dates[day]), day })
                              : undefined
                          }
                          onChange={() => onToggle(task.id, day)}
                          label={`${DAY_NAMES[day]}: ${name}`}
                        />
                      </td>
                    ))}
                    <td className="p-0 text-center text-xs tabular-nums">
                      {(task.text.trim() || done > 0) && (
                        <span className="inline-flex flex-col items-center gap-1" aria-label={`${done} of ${activeDays} days`}>
                          <span className={finished ? "font-semibold text-accent" : "text-muted"}>
                            {done}/{activeDays}
                          </span>
                          <span aria-hidden="true" className="no-print block h-[3px] w-8 overflow-hidden rounded-full bg-line">
                            <span
                              className="block h-full rounded-full bg-accent transition-[width] duration-500"
                              style={{ width: `${activeDays ? (done / activeDays) * 100 : 0}%` }}
                            />
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="no-print p-0">
                      <div className="flex items-center justify-center opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                        <button
                          type="button"
                          className={iconBtn}
                          disabled={done === 0 || !ready}
                          onClick={() => onClear(task.id)}
                          aria-label={`Clear all marks for ${name}`}
                          title="Clear marks"
                        >
                          <UndoIcon width={16} height={16} />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          disabled={!ready}
                          onClick={() => onDelete(task.id)}
                          aria-label={`Delete ${name}`}
                          title="Delete habit"
                        >
                          <TrashIcon width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {menu && (
        <CellMenu
          x={menu.x}
          y={menu.y}
          title={`${menu.habit} · ${DAY_NAMES[menu.day]}`}
          rest={restDays.isCellRest(menu.date, menu.habit)}
          onToggle={() => restDays.toggleCell(menu.date, menu.habit)}
          onClose={() => setMenu(null)}
        />
      )}

      <button
        type="button"
        disabled={!ready}
        onClick={addHabit}
        className="no-print mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
      >
        <PlusIcon width={16} height={16} /> Add habit
      </button>
    </section>
  );
};

export default TaskTable;
