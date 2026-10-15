import { useState } from "react";
import { DAY_NAMES, DAY_SHORT } from "../lib/dates";
import DayBox from "./DayBox";
import { PlusIcon, TrashIcon, UndoIcon } from "./Icons";

const MIN_VISIBLE = 8; // rows shown on screen at minimum; print always shows them all
const SPARE = 3; // empty rows kept below the last habit

const focusTask = (id) =>
  requestAnimationFrame(() => document.getElementById(`task-${id}`)?.focus());

const iconBtn =
  "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-0";

const TaskTable = ({ week, dates, todayIndex, ready, onText, onToggle, onClear, onDelete, onAdd }) => {
  // empty rows revealed on top of the default, by Enter or "Add habit"
  const [extra, setExtra] = useState(0);

  const lastUsed = week.reduce(
    (last, t, i) => (t.text.trim() || t.days.some(Boolean) ? i : last),
    -1,
  );
  const visible = Math.min(week.length, Math.max(MIN_VISIBLE, lastUsed + 1 + SPARE) + extra);
  const firstBlank = week.findIndex((t) => !t.text.trim() && !t.days.some(Boolean));

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
        <div className="scroll-x overflow-x-auto">
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
