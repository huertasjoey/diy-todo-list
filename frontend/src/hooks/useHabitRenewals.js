import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { endedHabits, renewHabit } from "../lib/plannerDb";

/**
 * Habits from last month that are paused until someone says whether to continue them.
 * `onChange` runs after a habit is continued, so the planner can reload the weeks it joined.
 */
export default function useHabitRenewals(userId, thisMonday, onChange) {
  const [ended, setEnded] = useState([]);
  const [busy, setBusy] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    endedHabits(thisMonday)
      .then((names) => !cancelled && setEnded(names))
      .catch(() => {
        // not worth interrupting anyone for; the question comes back on the next load
      });
    return () => {
      cancelled = true;
    };
  }, [userId, thisMonday]);

  const decide = useCallback(
    async (texts, continued) => {
      setBusy((b) => new Set([...b, ...texts]));
      let failed = null;
      for (const text of texts) {
        try {
          await renewHabit({ userId, weekStart: thisMonday, text, continued });
          setEnded((list) => list.filter((h) => h !== text));
        } catch (e) {
          failed = e;
        }
      }
      setBusy((b) => new Set([...b].filter((t) => !texts.includes(t))));
      if (failed) toast.error(`Couldn't save: ${failed.message}`);
      if (continued) onChange?.();
    },
    [userId, thisMonday, onChange],
  );

  return { ended, busy, decide };
}
