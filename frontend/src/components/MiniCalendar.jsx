import { useState } from "react";
import { DAY_NAMES, DAY_SHORT, addDays, monthGrid, toKey } from "../lib/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

/**
 * A month you can browse. The selected week is highlighted and today is marked.
 * Pick any day to open that day's week. Remount it (via `key`) to recenter on a week.
 */
const MiniCalendar = ({ monday, todayKey, onPick }) => {
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
            className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted"
          >
            {d[0]}
          </span>
        ))}
        {days.map((day) => {
          const key = toKey(day);
          const inWeek = key >= weekStart && key <= weekEnd;
          const isToday = key === todayKey;
          const inMonth = day.getMonth() === view.getMonth();
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(day)}
              aria-label={`${dayFmt.format(day)}${isToday ? ", today" : ""}`}
              aria-current={isToday ? "date" : undefined}
              className={`relative flex h-9 cursor-pointer items-center justify-center text-[13px] tabular-nums transition-colors ${
                inWeek ? "bg-accent-soft" : "hover:bg-surface-2"
              } ${key === weekStart ? "rounded-l-full" : ""} ${key === weekEnd ? "rounded-r-full" : ""} ${
                inMonth ? "text-ink" : "text-muted/60"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isToday ? "bg-accent font-semibold text-accent-ink" : ""
                }`}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default MiniCalendar;
