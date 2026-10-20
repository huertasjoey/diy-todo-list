import { useState } from "react";
import { DAY_NAMES, DAY_SHORT, toKey } from "../lib/dates";
import { STATUS, formatRangeText, goalStatus, percentLabel, progressPercent, progressText } from "../lib/goals";
import DayBox from "./DayBox";
import { BookIcon, PlusIcon, TrashIcon, UndoIcon } from "./Icons";

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
}) => {
  // empty rows revealed on top of the default, by Enter or "Add habit"
  const [extra, setExtra] = useState(0);

  const lastUsed = week.reduce(
    (last, t, i) => (t.text.trim() || t.days.some(Boolean) ? i : last),
    -1,
  );
  const visible = Math.min(week.length, Math.max(MIN_VISIBLE, lastUsed + 1) + extra);
  const firstBlank = week.findIndex((t) => !t.text.trim() && !t.days.some(Boolean));

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

  return (
    <>
      <div className="habit-card overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="scroll-x relative overflow-x-auto">
          <table className="planner-table w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">
              Weekly habits with one checkbox for each day of the week
            </caption>
            <thead>
              <tr className="bg-surface-2/60 text-muted">
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-[36%] min-w-44 bg-surface-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
                >
                  Habits
                </th>
                {DAY_SHORT.map((short, i) => (
                  <th
                    key={short}
                    scope="col"
                    aria-label={`${DAY_NAMES[i]} ${dates[i].getDate()}${i === todayIndex ? ", today" : ""}`}
                    className={`w-14 min-w-14 px-0 py-2.5 text-center ${
                      i === todayIndex ? "bg-accent-soft text-ink" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="block text-[11px] font-semibold uppercase tracking-[0.12em]"
                    >
                      {short}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mx-auto mt-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium ${
                        i === todayIndex ? "bg-accent text-accent-ink" : "text-ink"
                      }`}
                    >
                      {dates[i].getDate()}
                    </span>
                  </th>
                ))}
                <th scope="col" className="w-16 px-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em]">
                  Week
                </th>
                <th scope="col" className="no-print w-24">
                  <span className="sr-only">Row actions</span>
                </th>
              </tr>
            </thead>
            {goalLanes.length > 0 && (
              <tbody className="no-print border-t border-line">
                {shownLanes.map((lane, laneIndex) => (
                  <tr key={laneIndex}>
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] bg-surface px-5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-goal"
                    >
                      {laneIndex === 0 ? "Goals" : <span className="sr-only">Goals, row {laneIndex + 1}</span>}
                    </th>
                    {Array.from({ length: 7 }, (_, day) => {
                      const seg = lane.find((x) => x.start === day);
                      if (seg) {
                        const g = seg.goal;
                        const st = goalStatus(g, todayKey);
                        return (
                          <td key={day} colSpan={seg.end - seg.start + 1} className="px-0.5 py-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenGoal(g)}
                              title={`${g.title}
${formatRangeText(g)}
${progressText(g)}${progressPercent(g) === null ? '' : ` (${progressPercent(g)}%)`}`}
                              aria-label={`Goal: ${g.title}, ${formatRangeText(g)}, ${percentLabel(g)}, ${STATUS[st].label}. Open details`}
                              className={`flex h-8 w-full cursor-pointer items-center gap-2 overflow-hidden border-l-[3px] px-2.5 text-left text-xs font-medium text-ink transition-opacity hover:opacity-80 ${STATUS[st].bar} ${
                                seg.clippedLeft ? "rounded-l-none" : "rounded-l-md"
                              } ${seg.clippedRight ? "rounded-r-none" : "rounded-r-md"}`}
                            >
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
                    <td colSpan={10} className="px-5 pb-2 pt-0.5 text-xs text-muted">
                      <a href="#goals" className="font-medium text-goal underline underline-offset-2">
                        +{hiddenGoals} more {hiddenGoals === 1 ? "goal" : "goals"} this week
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            )}
            {dates.some((d) => diaryDays.has(toKey(d))) && (
              <tbody className="no-print border-t border-line">
                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-[1] bg-surface px-5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-diary"
                  >
                    Diary
                  </th>
                  {dates.map((d, i) => {
                    const entry = diaryDays.get(toKey(d));
                    return (
                      <td key={toKey(d)} className="px-0.5 py-1.5 text-center">
                        {entry && (
                          <button
                            type="button"
                            onClick={() => onOpenDiary(toKey(d))}
                            title={`${DAY_NAMES[i]}: diary ${entry.draft ? "draft" : "entry"}, ${entry.words} words`}
                            aria-label={`Diary ${entry.draft ? "draft" : "entry"} for ${DAY_NAMES[i]} ${d.getDate()}, ${entry.words} words. Open it`}
                            className={`flex h-8 w-full cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border-l-[3px] border-diary bg-diary-soft px-1 text-xs font-medium text-diary transition-opacity hover:opacity-80 ${
                              entry.draft ? "border-dashed" : ""
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
                const done = task.days.filter(Boolean).length;
                const finished = task.text.trim() !== "" && done === 7;
                const name = task.text.trim() || `row ${index + 1}`;
                return (
                  <tr
                    key={task.id}
                    className={`task-row group border-t border-line transition-colors hover:bg-surface-2/50 ${
                      index >= visible ? "hidden print:table-row" : ""
                    }`}
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] bg-surface p-0 text-left font-normal group-hover:bg-surface-2"
                    >
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleEnter(index, task.id);
                          }
                        }}
                        className={`h-14 w-full min-w-44 bg-transparent px-5 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:bg-accent-soft/60 focus-visible:outline-none print:placeholder:text-transparent ${
                          finished ? "text-muted line-through decoration-muted/50" : "text-ink"
                        }`}
                      />
                    </th>
                    {task.days.map((checked, day) => (
                      <td
                        key={day}
                        className={`p-0 text-center ${day === todayIndex ? "bg-accent-soft/50" : ""}`}
                      >
                        <DayBox
                          checked={checked}
                          disabled={!ready}
                          onChange={() => onToggle(task.id, day)}
                          label={`${DAY_NAMES[day]}: ${name}`}
                        />
                      </td>
                    ))}
                    <td className="p-0 text-center text-xs tabular-nums">
                      <span
                        className={done === 7 && task.text.trim() ? "font-semibold text-accent" : "text-muted"}
                        aria-label={`${done} of 7 days`}
                      >
                        {task.text.trim() || done ? `${done}/7` : ""}
                      </span>
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

      <button
        type="button"
        disabled={!ready}
        onClick={addHabit}
        className="no-print mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
      >
        <PlusIcon width={16} height={16} /> Add habit
      </button>
    </>
  );
};

export default TaskTable;
