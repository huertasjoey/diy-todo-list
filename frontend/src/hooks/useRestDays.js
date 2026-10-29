import { useCallback, useState } from "react";
import toast from "react-hot-toast";

// Rest days are kept in this browser (per account).
//  - a whole day (every habit rests): "YYYY-MM-DD"
//  - one habit on one day (not every habit has rest days, e.g. drinking water): "YYYY-MM-DD|habit name"
const dayKey = (userId) => `kaizen.rest.${userId}`;
const cellKey = (userId) => `kaizen.restcells.${userId}`;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const read = (key, ok) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((k) => typeof k === "string" && ok(k)) : []);
  } catch {
    return new Set();
  }
};

const write = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set].sort()));
  } catch {
    toast.error("Couldn't save in this browser, so this rest day won't be kept.");
  }
};

export const cellId = (date, habit) => `${date}|${habit.trim()}`;

/** Rest days: whole days, and single habits on single days. Both are skipped by every progress figure. */
export default function useRestDays(userId) {
  const [rest, setRest] = useState(() => read(dayKey(userId), (k) => DATE.test(k)));
  const [cells, setCells] = useState(() => read(cellKey(userId), (k) => DATE.test(k.slice(0, 10)) && k[10] === "|"));

  const flip = (setter, key, id) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      write(key, next);
      return next;
    });

  const toggle = useCallback((date) => flip(setRest, dayKey(userId), date), [userId]);
  const toggleCell = useCallback((date, habit) => flip(setCells, cellKey(userId), cellId(date, habit)), [userId]);

  return {
    rest,
    cells,
    toggle,
    toggleCell,
    isRest: (date) => rest.has(date),
    isCellRest: (date, habit) => cells.has(cellId(date, habit)),
    /** true when this habit has no tick to make on this day, for either reason */
    isOff: (date, habit) => rest.has(date) || cells.has(cellId(date, habit)),
  };
}
