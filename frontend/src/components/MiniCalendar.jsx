import { useState } from "react";
import { DAY_NAMES, DAY_SHORT, addDays, monthGrid, toKey } from "../lib/dates";
import { STATUS, goalStatus, goalsOnDay } from "../lib/goals";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

/**
 * A month you can browse. The selected week is highlighted and today is marked.
 * Pick any day to open that day's week. Remount it (via `key`) to recenter on a week.
 */
const MiniCalendar = ({ monday, todayKey, onPick, goals = [], diaryDays = new Map() }) => {
  const [view, setView] = useState(() => addDays(monday, 3)); // Thursday decides the month
  const days = monthGrid(view);
  const weekStart = toKey(monday);
  const weekEnd = toKey(addDays(monday, 6));

  const shiftMonth = (n) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));

  return (
    <section aria-label="Calendar">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl leading-none">{monthFmt.format(view)}</h2>
        <div className="flex">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronRightIcon width={18} height={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {DAY_SHORT.map((d, i) => (
          <span
            key={d}
            aria-hidden="true"
            title={DAY_NAMES[i]}
            className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"
          >
            {d[0]}
          </span>
        ))}
        {days.map((day) => {
          const key = toKey(day);
          const inWeek = key >= weekStart && key <= weekEnd;
          const isToday = key === todayKey;
          const inMonth = day.getMonth() === view.getMonth();
          const dayGoals = goalsOnDay(goals, key);
          const diaryEntry = diaryDays.get(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(day)}
              aria-label={`${dayFmt.format(day)}${isToday ? ", today" : ""}${
                dayGoals.length ? `, ${dayGoals.length} ${dayGoals.length === 1 ? "goal" : "goals"}` : ""
              }${diaryEntry ? (diaryEntry.draft ? ", diary draft" : ", diary entry") : ""}`}
              aria-current={isToday ? "date" : undefined}
              className={`relative flex h-10 cursor-pointer items-center justify-center text-[13px] tabular-nums transition-colors ${
                inWeek ? "bg-accent-soft" : "hover:bg-surface-2"
              } ${key === weekStart ? "rounded-l-full" : ""} ${key === weekEnd ? "rounded-r-full" : ""} ${
                inMonth ? "text-ink" : "text-muted/60"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  isToday ? "bg-accent font-semibold text-accent-ink" : ""
                }`}
              >
                {day.getDate()}
              </span>
              {/* one thin bar per goal running through this day; neighbours join up into a range */}
              {dayGoals.length > 0 && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0.5 flex flex-col gap-px" aria-hidden="true">
                  {dayGoals.slice(0, 3).map((g) => (
                    <span
                      key={g.id}
                      className={`h-[2px] ${STATUS[goalStatus(g, todayKey)].fill} ${
                        g.startDate === key ? "ml-1.5 rounded-l-full" : ""
                      } ${g.endDate === key ? "mr-1.5 rounded-r-full" : ""}`}
                    />
                  ))}
                </span>
              )}
              {/* a dot for a diary entry (hollow for a draft): a different shape from the goal bars */}
              {diaryEntry && (
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full border border-diary ${
                    diaryEntry.draft ? "bg-transparent" : "bg-diary"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-diary" /> Diary
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-[3px] w-3.5 rounded-full bg-goal" /> Goal
        </span>
      </p>
    </section>
  );
};

export default MiniCalendar;
