import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { addDays, mondayOf, toKey } from "../lib/dates";
import { carriedHabits, loadWeek, saveWeekJob } from "../lib/plannerDb";
import { uuid } from "../lib/uuid";
import { wasCleared } from "./useWeek";

const STEP = 1000;
const dayIndex = (date) => (date.getDay() + 6) % 7; // Monday = 0

/**
 * One calendar month of habit check-ins. Marks live in the same weekly records the Week view
 * uses (a week that straddles two months is shared), so nothing is stored twice.
 * Statuses: loading | ready | loadError
 */
export default function useMonth(monthStart, userId) {
  const [weeks, setWeeks] = useState(() => new Map()); // weekKey -> { weekId, tasks }
  const [upcoming, setUpcoming] = useState([]); // habit names for a month that hasn't started
  const [status, setStatus] = useState("loading");
  const [reloads, setReloads] = useState(0);
  const weeksRef = useRef(weeks);
  const chain = useRef(Promise.resolve()); // writes reach the database in order

  const monthKey = toKey(monthStart);
  const days = useMemo(() => {
    const out = [];
    for (let d = new Date(monthStart); d.getMonth() === monthStart.getMonth(); d = addDays(d, 1)) out.push(d);
    return out;
  }, [monthStart]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const thisMonday = toKey(mondayOf(new Date()));
        const next = new Map();
        const mondays = [...new Set(days.map((d) => toKey(mondayOf(d))))];
        // in order, so a carried-over week can copy from the one just stored before it
        for (const wk of mondays) {
          // habits carry into the current week, never into the future or the past
          const carry = wk === thisMonday && !wasCleared(userId, wk);
          const data = await loadWeek(wk, { carry });
          let weekId = data.weekId;
          if (data.carried) {
            weekId = await saveWeekJob({
              userId,
              weekStart: wk,
              weekId,
              job: {
                tasks: new Map(data.tasks.map((t) => [t.id, { position: t.position, text: t.text, days: t.days }])),
              },
            });
          }
          next.set(wk, { weekId, tasks: data.tasks });
        }
        // a month entirely in the future has no weeks yet: it shows the habits that will carry into it
        const names = mondays[0] > thisMonday ? (await carriedHabits(mondays[0])).map((t) => t.text.trim()) : [];
        if (cancelled) return;
        weeksRef.current = next;
        setUpcoming(names);
        setWeeks(next);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setStatus("loadError");
        toast.error(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [monthKey, days, userId, reloads]);

  // The habits listed are the ones in the latest week up to today, so removing a habit in the
  // Week view removes it here too. Marks already ticked in earlier weeks stay stored, and come
  // back if the same habit is added again. A month that has ended is judged by its own last week.
  const habits = useMemo(() => {
    const thisMonday = toKey(mondayOf(new Date()));
    const ordered = [...weeks].sort(([a], [b]) => (a < b ? -1 : 1));
    const names = (w) => [...new Set(w.tasks.filter((t) => t.text.trim()).sort((a, b) => a.position - b.position).map((t) => t.text.trim()))];
    // a week that was opened and saved counts even when it is empty (everything was removed on purpose)
    const counts = ([k, w]) => k <= thisMonday && (w.weekId || w.tasks.some((t) => t.text.trim()));
    const ref = ordered.filter(counts).at(-1) ?? ordered.filter(([, w]) => w.tasks.some((t) => t.text.trim())).at(-1);
    return ref ? names(ref[1]) : upcoming;
  }, [weeks, upcoming]);

  // habits that were ticked or listed earlier in the month but have since been removed
  const removed = useMemo(() => {
    const seen = new Set();
    for (const [, w] of [...weeks].sort(([a], [b]) => (a < b ? -1 : 1))) {
      for (const t of w.tasks) if (t.text.trim()) seen.add(t.text.trim());
    }
    return [...seen].filter((h) => !habits.includes(h));
  }, [weeks, habits]);

  const isChecked = useCallback(
    (text, date) => {
      const task = weeks.get(toKey(mondayOf(date)))?.tasks.find((t) => t.text.trim() === text);
      return Boolean(task?.days[dayIndex(date)]);
    },
    [weeks],
  );

  const toggle = (text, date) => {
    if (status !== "ready") return;
    const wk = toKey(mondayOf(date));
    const di = dayIndex(date);
    const cur = weeksRef.current;
    const week = cur.get(wk) ?? { weekId: null, tasks: [] };
    const found = week.tasks.find((t) => t.text.trim() === text);

    let updated;
    let tasks;
    if (found) {
      updated = { ...found, days: found.days.map((v, i) => (i === di ? !v : v)) };
      tasks = week.tasks.map((t) => (t.id === found.id ? updated : t));
    } else {
      // a habit that wasn't in this week yet: it joins the week the first time it's ticked
      const last = week.tasks.reduce((m, t) => Math.max(m, t.position), 0);
      updated = { id: uuid(), position: last + STEP, text, days: Array.from({ length: 7 }, (_, i) => i === di) };
      tasks = [...week.tasks, updated];
    }

    const next = new Map(cur).set(wk, { ...week, tasks });
    weeksRef.current = next;
    setWeeks(next);

    chain.current = chain.current.then(async () => {
      try {
        const id = await saveWeekJob({
          userId,
          weekStart: wk,
          weekId: weeksRef.current.get(wk)?.weekId,
          job: { tasks: new Map([[updated.id, { position: updated.position, text: updated.text, days: updated.days }]]) },
        });
        const w = weeksRef.current.get(wk);
        if (w && !w.weekId) w.weekId = id;
      } catch (e) {
        toast.error(`Couldn't save: ${e.message}`);
        setReloads((n) => n + 1); // show what is really stored
      }
    });
  };

  return { days, habits, removed, status, isChecked, toggle, retry: () => setReloads((n) => n + 1) };
}
