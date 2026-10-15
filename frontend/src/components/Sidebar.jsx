import { useState } from "react";
import { isoWeek, toKey } from "../lib/dates";
import { CalendarIcon, DownloadIcon, PrinterIcon, UndoIcon } from "./Icons";
import MiniCalendar from "./MiniCalendar";
import ProgressRing from "./ProgressRing";

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

const toolBtn =
  "flex min-h-14 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 text-center text-xs font-medium lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-left lg:text-sm text-ink transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

/** Live date and time, a month calendar, the week's progress and the tools. */
const Sidebar = ({ now, monday, stats, ready, onPick, onPrint, onCsv, onReset }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const todayKey = toKey(now);

  return (
    <aside className="no-print border-b border-line px-4 py-6 sm:px-8 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
      {/* Live clock */}
      <div className="flex items-end justify-between gap-4 lg:block">
        <div>
          <time
            dateTime={now.toISOString()}
            className="block font-display text-5xl leading-none tracking-tight tabular-nums lg:text-6xl"
          >
            {timeFmt.format(now)}
          </time>
          <p className="mt-2 text-sm text-muted">{dateFmt.format(now)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-muted">
            Week {isoWeek(now)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCalendar((s) => !s)}
          aria-expanded={showCalendar}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition-colors hover:bg-surface-2 lg:hidden"
        >
          <CalendarIcon width={16} height={16} /> Calendar
        </button>
      </div>

      {/* Month calendar (always shown on large screens, behind a toggle on small ones) */}
      <div className={`${showCalendar ? "block" : "hidden"} mt-6 lg:mt-8 lg:block`}>
        <MiniCalendar key={toKey(monday)} monday={monday} todayKey={todayKey} onPick={onPick} />
      </div>

      {/* This week */}
      <div className="mt-6 flex items-center gap-5 rounded-2xl border border-line bg-surface p-5 lg:mt-8">
        <ProgressRing percent={stats.percent} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            This week
          </p>
          <p className="mt-1 text-sm">
            {stats.total
              ? `${stats.checked} of ${stats.total} check-ins`
              : "Add a habit to start tracking"}
          </p>
          {stats.habits > 0 && (
            <p className="text-xs text-muted">
              {stats.habits} {stats.habits === 1 ? "habit" : "habits"}
            </p>
          )}
        </div>
      </div>

      {/* Tools */}
      <div className="mt-4 grid grid-cols-3 gap-1 lg:mt-6 lg:grid-cols-1">
        <button type="button" className={toolBtn} onClick={onPrint}>
          <PrinterIcon width={18} height={18} className="text-muted" /> Print planner
        </button>
        <button type="button" className={toolBtn} onClick={onCsv} disabled={!ready}>
          <DownloadIcon width={18} height={18} className="text-muted" /> Export CSV
        </button>
        <button type="button" className={toolBtn} onClick={onReset} disabled={!ready || stats.checked === 0}>
          <UndoIcon width={18} height={18} className="text-muted" /> Reset marks
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
