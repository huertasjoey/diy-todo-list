import { useCallback, useState } from "react";
import toast from "react-hot-toast";

// Rest days are kept in this browser (per account), as a list of YYYY-MM-DD dates.
const keyFor = (userId) => `kaizen.rest.${userId}`;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const load = (userId) => {
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(userId)) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((k) => typeof k === "string" && DATE.test(k)) : []);
  } catch {
    return new Set();
  }
};

/** The days you've marked as rest days. A rest day is skipped by every progress figure. */
export default function useRestDays(userId) {
  const [rest, setRest] = useState(() => load(userId));

  const toggle = useCallback(
    (dateKey) => {
      setRest((prev) => {
        const next = new Set(prev);
        if (next.has(dateKey)) next.delete(dateKey);
        else next.add(dateKey);
        try {
          localStorage.setItem(keyFor(userId), JSON.stringify([...next].sort()));
        } catch {
          toast.error("Couldn't save in this browser, so this rest day won't be kept.");
        }
        return next;
      });
    },
    [userId],
  );

  return { rest, isRest: (dateKey) => rest.has(dateKey), toggle };
}
