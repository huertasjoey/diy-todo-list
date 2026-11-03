import { useState } from "react";
import { parseKey } from "../lib/dates";

const monthName = new Intl.DateTimeFormat(undefined, { month: "long" });
const smallBtn =
  "min-h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-50";

/**
 * A quiet banner listing last month's habits, which are paused until each one is continued
 * or stopped. Collapsed it only says how many are waiting.
 */
const HabitRenewals = ({ renewals, thisMonday }) => {
  const [open, setOpen] = useState(false);
  const { ended, busy, decide } = renewals;
  if (ended.length === 0) return null;

  const month = monthName.format(parseKey(thisMonday));
  const count = ended.length === 1 ? "1 habit" : `${ended.length} habits`;

  return (
    <section
      aria-label="Habits to renew"
      className="no-print mb-6 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <strong className="font-semibold">{count} from last month ended.</strong>{" "}
          <span className="text-muted">They’re paused until you choose.</span>
        </p>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`${smallBtn} border border-accent/40 hover:bg-surface`}
        >
          {open ? "Hide" : "Review"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          <p className="mb-3 text-xs text-muted">
            Habits last one month. Continue one to keep it going through {month}.
          </p>
          <ul className="divide-y divide-line/70 rounded-xl border border-line bg-surface">
            {ended.map((h) => (
              <li key={h} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="min-w-0 break-words text-[15px]">{h}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy.has(h)}
                    onClick={() => decide([h], false)}
                    aria-label={`Stop ${h}`}
                    className={`${smallBtn} border border-line text-muted hover:bg-surface-2 hover:text-ink`}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    disabled={busy.has(h)}
                    onClick={() => decide([h], true)}
                    aria-label={`Continue ${h}`}
                    className={`${smallBtn} bg-accent text-accent-ink hover:opacity-90`}
                  >
                    Continue
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {ended.length > 1 && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={busy.size > 0}
                onClick={() => decide(ended, true)}
                className={`${smallBtn} font-semibold text-accent underline underline-offset-4 hover:opacity-80`}
              >
                Continue all
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default HabitRenewals;
