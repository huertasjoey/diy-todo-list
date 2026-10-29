import { useMemo, useState } from "react";
import { DAY_INITIALS, DAY_NAMES, mondayOf, toKey } from "../lib/dates";
import useMonth from "../hooks/useMonth";
import ConfirmDialog from "./ConfirmDialog";
import { CheckIcon, TrashIcon } from "./Icons";

const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayIdx = (d) => (d.getDay() + 6) % 7;

const CHART_H = 140;
const SHORT_DAY = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Black bars on a 0-100% scale with faint guide lines. `wide` is for a few chunky bars (weeks).
const Chart = ({ bars, label, wide = false }) => (
  <div className="flex gap-2" role="img" aria-label={label}>
    <div className="relative shrink-0 text-right text-[10px] tabular-nums text-muted" style={{ height: CHART_H, width: 30 }}>
      {[100, 75, 50, 25, 0].map((v) => (
        <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - v}%` }}>
          {v}%
        </span>
      ))}
    </div>
    <div className="min-w-0 flex-1">
      <div
        className={`relative flex items-end border-b border-l border-line ${wide ? "justify-around gap-2 px-2" : "gap-[3px] pl-1"}`}
        style={{ height: CHART_H }}
      >
        {[25, 50, 75, 100].map((v) => (
          <span key={v} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-line/60" style={{ bottom: `${v}%` }} />
        ))}
        {bars.map((b) => (
          <div
            key={b.key}
            title={b.title}
            className={`relative min-w-0 rounded-t-[3px] transition-[height] duration-300 ${wide ? "w-full max-w-14" : "flex-1"} ${b.today ? "bg-accent" : "bg-ink"}`}
            style={{ height: `${Math.max(b.future ? 0 : b.percent, b.future ? 0 : 1)}%` }}
          />
        ))}
      </div>
      <div className={`flex ${wide ? "justify-around gap-2 px-2" : "gap-[3px] pl-1"}`}>
        {bars.map((b) => (
          <span
            key={b.key}
            aria-hidden="true"
            className={`min-w-0 text-[10px] leading-none text-muted ${wide ? "w-full max-w-14 pt-2 text-center" : "flex-1 pt-1.5 text-center"} ${b.today ? "font-bold text-ink" : ""}`}
            style={wide ? undefined : { writingMode: "vertical-rl", transform: "rotate(180deg)", height: 28 }}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  </div>
);

/** The month at a glance: a daily progress chart, then every habit against every day. */
const MonthView = ({ monthStart, userId, todayKey }) => {
  const { days, habits, removed, removeHabit, status, isChecked, toggle, retry } = useMonth(monthStart, userId);
  const ready = status === "ready";
  const [confirmRemove, setConfirmRemove] = useState(null); // the removed habit waiting to be deleted for good

  // for each day: how many habits were done, and the share of all habits
  const perDay = useMemo(
    () =>
      days.map((d) => {
        const done = habits.filter((h) => isChecked(h, d)).length;
        return { done, percent: habits.length ? Math.round((done / habits.length) * 100) : 0 };
      }),
    [days, habits, isChecked],
  );

  // week groups for the header: "Week 1" over the days that belong to it
  const groups = useMemo(() => {
    const out = [];
    for (const d of days) {
      const k = toKey(mondayOf(d));
      if (out.at(-1)?.key === k) out.at(-1).count += 1;
      else out.push({ key: k, count: 1 });
    }
    return out;
  }, [days]);

  // each week's average over its days so far (a week that hasn't started shows empty)
  const weekly = useMemo(() => {
    let at = 0;
    return groups.map((g) => {
      const slice = perDay.slice(at, at + g.count).filter((_, i) => toKey(days[at + i]) <= todayKey);
      at += g.count;
      return {
        key: g.key,
        future: slice.length === 0,
        percent: slice.length ? Math.round(slice.reduce((n, d) => n + d.percent, 0) / slice.length) : 0,
      };
    });
  }, [groups, perDay, days, todayKey]);

  const elapsed = perDay.filter((_, i) => toKey(days[i]) <= todayKey);
  const average = elapsed.length && habits.length ? Math.round(elapsed.reduce((n, d) => n + d.percent, 0) / elapsed.length) : 0;

  if (status === "loadError")
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center" role="alert">
        <p className="font-display text-3xl">This month didn’t load</p>
        <p className="mt-2 text-sm text-muted">Your saved habits are safe. Check your connection, then try again.</p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 min-h-11 cursor-pointer rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className={`transition-opacity ${status === "loading" ? "opacity-50" : ""}`} aria-busy={status === "loading"}>
      {/* progress charts: a black title bar over each, like a printed tracker */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <section aria-label={`Daily progress for ${monthFmt.format(monthStart)}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h3 className="bg-ink px-4 py-2.5 text-center text-sm font-bold tracking-wide text-bg">Daily Progress</h3>
          <div className="p-3 sm:p-4">
            <Chart
              role="img"
              label={`Average ${average} percent of habits done per day so far this month`}
              bars={perDay.map((d, i) => {
                const key = toKey(days[i]);
                return {
                  key,
                  percent: key > todayKey ? 0 : d.percent,
                  future: key > todayKey,
                  today: key === todayKey,
                  label: SHORT_DAY[dayIdx(days[i])],
                  title: `${DAY_NAMES[dayIdx(days[i])]} ${days[i].getDate()}: ${d.done} of ${habits.length} habits (${d.percent}%)`,
                };
              })}
            />
            <p className="mt-2 text-right text-xs text-muted">
              Average so far <span className="font-semibold tabular-nums text-ink">{average}%</span>
            </p>
          </div>
        </section>

        <section aria-label="Weekly progress" className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h3 className="bg-ink px-4 py-2.5 text-center text-sm font-bold tracking-wide text-bg">Weekly Progress</h3>
          <div className="p-3 sm:p-4">
            <Chart
              role="img"
              label="Average percent of habits done in each week of the month"
              wide
              bars={weekly.map((w, i) => ({
                key: w.key,
                percent: w.percent,
                future: w.future,
                label: `week ${i + 1}`,
                title: `Week ${i + 1}: ${w.percent}% average`,
              }))}
            />
          </div>
        </section>
      </div>

      {/* the month grid */}
      <div className="habit-card mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        {habits.length === 0 && removed.length === 0 && ready ? (
          <p className="px-6 py-14 text-center text-sm text-muted">
            No habits yet. Switch to the Week view and add some. They will show up here.
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse text-center">
              <caption className="sr-only">{`Habit check-ins for ${monthFmt.format(monthStart)}, one box per habit per day`}</caption>
              <thead>
                <tr className="bg-surface-2/60">
                  <th rowSpan={3} scope="col" className="sticky left-0 z-10 min-w-36 bg-surface-2 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:min-w-52">
                    Habits
                  </th>
                  {groups.map((g, i) => (
                    <th
                      key={g.key}
                      scope="colgroup"
                      colSpan={g.count}
                      className="border-l border-line px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink"
                    >
                      {g.count > 2 ? `Week ${i + 1}` : `Wk ${i + 1}`}
                    </th>
                  ))}
                  <th rowSpan={3} scope="col" className="min-w-14 border-l border-line px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Month
                  </th>
                </tr>
                <tr className="bg-surface-2/60 text-[10px] font-semibold uppercase text-muted">
                  {days.map((d) => (
                    <th key={toKey(d)} scope="col" aria-hidden="true" className={`min-w-9 px-0 pt-1 ${toKey(d) === todayKey ? "bg-accent-soft text-ink" : ""} ${dayIdx(d) === 0 ? "border-l border-line" : ""}`}>
                      {DAY_INITIALS[dayIdx(d)]}
                    </th>
                  ))}
                </tr>
                <tr className="bg-surface-2/60 text-xs tabular-nums">
                  {days.map((d) => (
                    <th
                      key={toKey(d)}
                      scope="col"
                      aria-label={`${DAY_NAMES[dayIdx(d)]} ${d.getDate()}${toKey(d) === todayKey ? ", today" : ""}`}
                      className={`px-0 pb-1.5 font-medium ${toKey(d) === todayKey ? "bg-accent-soft" : ""} ${dayIdx(d) === 0 ? "border-l border-line" : ""}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mx-auto flex h-5 min-w-5 items-center justify-center rounded-full ${toKey(d) === todayKey ? "bg-accent text-accent-ink" : ""}`}
                      >
                        {d.getDate()}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...habits, ...removed].map((h) => {
                  const gone = removed.includes(h);
                  const done = days.filter((d) => isChecked(h, d)).length;
                  return (
                    <tr key={h} className={`group border-t border-line transition-colors hover:bg-surface-2/50 `}>
                      <th
                        scope="row"
                        className="sticky left-0 z-[1] max-w-[11rem] truncate bg-surface px-4 py-0 text-left text-sm font-normal group-hover:bg-surface-2 sm:max-w-xs"
                        title={h}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`min-w-0 truncate ${gone ? "text-muted line-through decoration-muted/60" : ""}`}>{h}</span>
                          {gone && (
                            <>
                              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                Removed
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmRemove(h)}
                                disabled={!ready}
                                aria-label={`Delete ${h} and its marks from this month`}
                                title="Delete for good"
                                className="ml-auto flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                              >
                                <TrashIcon width={16} height={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </th>
                      {days.map((d) => {
                        const on = isChecked(h, d);
                        const today = toKey(d) === todayKey;
                        return (
                          <td key={toKey(d)} className={`p-0 ${gone ? "opacity-50" : ""} ${today ? "bg-accent-soft/50" : ""} ${dayIdx(d) === 0 ? "border-l border-line" : ""}`}>
                            <label className="relative flex h-10 w-9 cursor-pointer items-center justify-center has-[:disabled]:cursor-default">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={on}
                                disabled={!ready || gone}
                                onChange={() => toggle(h, d)}
                                aria-label={`${DAY_NAMES[dayIdx(d)]} ${d.getDate()}: ${h}`}
                              />
                              <span
                                aria-hidden="true"
                                className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-muted/60 text-accent-ink transition-colors hover:border-accent peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
                              >
                                {on && <CheckIcon width={14} height={14} strokeWidth={3} />}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                      <td className="border-l border-line px-2 text-xs tabular-nums text-muted" aria-label={`${done} of ${days.length} days`}>
                        {done}/{days.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Add, rename or remove habits in the Week view. Marks you tick here show up there too. A habit marked Removed was taken out of the Week view; its earlier marks are kept.</p>
      <ConfirmDialog
        open={confirmRemove !== null}
        title="Delete this habit for good?"
        confirmLabel="Delete habit"
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          removeHabit(confirmRemove);
          setConfirmRemove(null);
        }}
      >
        “{confirmRemove}” and every mark you made on it this month will be permanently deleted. This can&apos;t be undone.
      </ConfirmDialog>
    </div>
  );
};

export default MonthView;
