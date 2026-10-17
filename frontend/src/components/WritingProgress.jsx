import { HEAT_WEEKS } from "../lib/diary";
import { parseKey } from "../lib/dates";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const fullFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: "short" });
const n = (v) => v.toLocaleString();

// five steps from "nothing" to "a lot": full class names so Tailwind can see them
const HEAT = ["bg-line", "bg-accent/25", "bg-accent/50", "bg-accent/75", "bg-accent"];

const Stat = ({ label, value, unit }) => (
  <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</dt>
    <dd className="mt-1 font-display text-4xl leading-none tabular-nums">
      {value}
      {unit && <span className="ml-1.5 font-sans text-sm text-muted">{unit}</span>}
    </dd>
  </div>
);

/**
 * How much you write, day by day. Word counts show writing habit, not English ability,
 * so nothing here pretends to grade your grammar or vocabulary.
 */
const WritingProgress = ({ stats, status, onRetry }) => {
  if (status === "loading")
    return (
      <div className="space-y-4" role="status" aria-label="Loading progress">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );

  if (status === "error")
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center" role="alert">
        <p className="font-display text-2xl">Progress didn&apos;t load</p>
        <button type="button" onClick={onRetry} className="mt-4 min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2">
          Try again
        </button>
      </div>
    );

  const max = Math.max(1, ...stats.last7.map((d) => d.words));
  const week = stats.last7.map((d) => `${dayFmt.format(parseKey(d.date))} ${d.words} words`).join(", ");

  // label a column with its month the first time that month appears
  const monthLabels = stats.heat.map((col, i) => {
    const m = parseKey(col[0].date).getMonth();
    const before = i > 0 ? parseKey(stats.heat[i - 1][0].date).getMonth() : -1;
    return m === before ? "" : monthFmt.format(parseKey(col[0].date));
  });

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entries written" value={n(stats.entries)} />
        <Stat label="Total words" value={n(stats.totalWords)} />
        <Stat label="Writing streak" value={n(stats.streak)} unit={stats.streak === 1 ? "day" : "days"} />
        <Stat label="Average per entry" value={n(stats.averageWords)} unit="words" />
      </dl>
      <p className="-mt-3 text-xs text-muted">
        {stats.entries === 0
          ? "Save your first entry and your progress will appear here."
          : stats.streak > 0
            ? `Your longest streak so far is ${stats.longest} ${stats.longest === 1 ? "day" : "days"}.${stats.wroteToday ? "" : " Write today to keep your streak going."}`
            : `Your longest streak so far is ${stats.longest} ${stats.longest === 1 ? "day" : "days"}. Write today to start a new one.`}
        {stats.drafts > 0 && ` Drafts aren't counted until you save them as entries (${stats.drafts} so far).`}
      </p>

      {/* the last 7 days */}
      <section aria-labelledby="week-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 id="week-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Weekly writing activity
        </h3>
        <p className="mt-1 text-sm text-muted">Words written each day, over the last 7 days.</p>
        <div role="img" aria-label={`Words written per day, last 7 days: ${week}`} className="mt-5 flex h-44 items-end gap-2 sm:gap-4">
          {stats.last7.map((d) => (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${fullFmt.format(parseKey(d.date))}: ${n(d.words)} words`}>
              <span className="text-xs tabular-nums text-muted">{d.words > 0 ? n(d.words) : ""}</span>
              <div
                className={`w-full max-w-14 rounded-t-lg ${d.wrote ? "bg-accent" : "bg-line"}`}
                style={{ height: `${d.wrote ? Math.max(6, (d.words / max) * 100) : 3}%` }}
              />
              <span className="text-xs font-medium">{dayFmt.format(parseKey(d.date))}</span>
            </div>
          ))}
        </div>
      </section>

      {/* heatmap */}
      <section aria-labelledby="heat-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h3 id="heat-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Days you wrote
        </h3>
        <p className="mt-1 text-sm text-muted">The last {HEAT_WEEKS} weeks. Darker means more words.</p>
        <div className="mt-4 overflow-x-auto pb-1">
          <div
            role="img"
            aria-label={`Calendar heatmap of the last ${HEAT_WEEKS} weeks. You wrote on ${stats.heat.flat().filter((c) => c.wrote).length} of those days.`}
            className="inline-flex gap-2"
          >
            <div className="flex flex-col gap-[3px] pt-5 text-[10px] text-muted" aria-hidden="true">
              {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
                <span key={i} className="flex h-3.5 items-center">
                  {d}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {stats.heat.map((col, c) => (
                <div key={c} className="flex flex-col gap-[3px]">
                  <span className="h-4 text-[10px] leading-4 text-muted" aria-hidden="true">
                    {monthLabels[c]}
                  </span>
                  {col.map((cell) => (
                    <span
                      key={cell.date}
                      title={cell.future ? undefined : `${fullFmt.format(parseKey(cell.date))}: ${cell.wrote ? `${n(cell.words)} words` : "no entry"}`}
                      className={`h-3.5 w-3.5 rounded-[3px] ${cell.future ? "bg-transparent" : HEAT[cell.level]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted" aria-hidden="true">
          Less
          {HEAT.map((cls, i) => (
            <span key={i} className={`h-3 w-3 rounded-[3px] ${cls}`} />
          ))}
          More
        </div>
      </section>

      <p className="text-xs leading-5 text-muted">
        These numbers show how much and how often you write. They can&apos;t measure how good your English is, so
        Kaizen doesn&apos;t give you a grammar or vocabulary score.
      </p>
    </div>
  );
};

export default WritingProgress;
