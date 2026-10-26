import { useMemo } from "react";
import { DAY_INITIALS, DAY_NAMES, mondayOf, toKey } from "../lib/dates";
import useMonth from "../hooks/useMonth";
import { CheckIcon } from "./Icons";

const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayIdx = (d) => (d.getDay() + 6) % 7;

const CHART_H = 140;

/** The month at a glance: a daily progress chart, then every habit against every day. */
const MonthView = ({ monthStart, userId, todayKey }) => {
  const { days, habits, status, isChecked, toggle, retry } = useMonth(monthStart, userId);
  const ready = status === "ready";

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
      {/* daily progress */}
      <section aria-label={`Daily progress for ${monthFmt.format(monthStart)}`} className="paper rounded-2xl border border-line p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Daily progress</h3>
          <p className="text-sm text-muted">
            Average so far <span className="font-display text-2xl tabular-nums text-ink">{average}%</span>
          </p>
        </div>

        <div className="mt-4 flex gap-2" role="img" aria-label={`Average ${average} percent of habits done per day so far this month`}>
          <div className="flex shrink-0 flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-muted" style={{ height: CHART_H + 20 }}>
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          <div className="flex min-w-0 flex-1 items-end gap-[3px] border-b border-l border-line pl-1" style={{ height: CHART_H + 20 }}>
            {perDay.map((d, i) => {
              const key = toKey(days[i]);
              const future = key > todayKey;
              const isToday = key === todayKey;
              return (
                <div key={key} className="flex min-w-0 flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
                  <div
                    title={`${DAY_NAMES[dayIdx(days[i])]} ${days[i].getDate()}: ${d.done} of ${habits.length} habits (${d.percent}%)`}
                    className={`w-full rounded-t-[3px] transition-[height] duration-300 ${future ? "bg-line/60" : isToday ? "bg-accent" : "bg-ink/80"}`}
                    style={{ height: future ? 3 : Math.max(3, (d.percent / 100) * CHART_H) }}
                  />
                  <span className={`mt-1 h-4 text-[9px] leading-4 tabular-nums ${isToday ? "font-bold text-ink" : "text-muted"}`}>
                    {days[i].getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* the month grid */}
      <div className="habit-card mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        {habits.length === 0 && ready ? (
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
                {habits.map((h) => {
                  const done = days.filter((d) => isChecked(h, d)).length;
                  return (
                    <tr key={h} className="group border-t border-line transition-colors hover:bg-surface-2/50">
                      <th
                        scope="row"
                        className="sticky left-0 z-[1] max-w-[11rem] truncate bg-surface px-4 py-0 text-left text-sm font-normal group-hover:bg-surface-2 sm:max-w-xs"
                        title={h}
                      >
                        {h}
                      </th>
                      {days.map((d) => {
                        const on = isChecked(h, d);
                        const today = toKey(d) === todayKey;
                        return (
                          <td key={toKey(d)} className={`p-0 ${today ? "bg-accent-soft/50" : ""} ${dayIdx(d) === 0 ? "border-l border-line" : ""}`}>
                            <label className="relative flex h-10 w-9 cursor-pointer items-center justify-center has-[:disabled]:cursor-default">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={on}
                                disabled={!ready}
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
      <p className="mt-3 text-xs text-muted">Add, rename or remove habits in the Week view. Marks you tick here show up there too.</p>
    </div>
  );
};

export default MonthView;
