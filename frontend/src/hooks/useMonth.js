import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { addDays, mondayOf, toKey } from "../lib/dates";
import { carriedHabits, loadWeek, saveWeekJob } from "../lib/plannerDb";
import { uuid } from "../lib/uuid";
import { markCleared, wasCleared } from "./useWeek";

const STEP = 1000;
const dayIndex = (date) => (date.getDay() + 6) % 7; // Monday = 0

// The week whose habits the month lists: the latest one up to today. A week that was opened and
// saved counts even when it is empty (everything was removed on purpose).
const listingKey = (weeks) => {
  const thisMonday = toKey(mondayOf(new Date()));
  const keys = [...weeks.keys()].sort();
  const has = (k) => weeks.get(k).tasks.some((t) => t.text.trim());
  return keys.filter((k) => k <= thisMonday && (weeks.get(k).weekId || has(k))).at(-1) ?? keys.filter(has).at(-1) ?? null;
};

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
    const ref = listingKey(weeks);
    if (!ref) return upcoming;
    const w = weeks.get(ref);
    return [...new Set(w.tasks.filter((t) => t.text.trim()).sort((a, b) => a.position - b.position).map((t) => t.text.trim()))];
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

  // Deletes a habit's rows from every week of this month (used for habits already removed from the Week view).
  const removeHabit = (text) => {
    if (status !== "ready") return;
    const cur = weeksRef.current;
    const next = new Map();
    const jobs = [];
    for (const [wk, w] of cur) {
      const gone = w.tasks.filter((t) => t.text.trim() === text);
      next.set(wk, gone.length ? { ...w, tasks: w.tasks.filter((t) => t.text.trim() !== text) } : w);
      if (gone.length) jobs.push([wk, w.weekId, new Map(gone.map((t) => [t.id, null]))]);
    }
    weeksRef.current = next;
    setWeeks(next);
    for (const [wk, weekId, tasks] of jobs) {
      chain.current = chain.current.then(async () => {
        try {
          await saveWeekJob({ userId, weekStart: wk, weekId, job: { tasks } });
        } catch (e) {
          toast.error(`Couldn't delete: ${e.message}`);
          setReloads((n) => n + 1);
        }
      });
    }
    toast.success("Habit deleted");
  };

  // Where a restored habit goes: the current week, or for a month that has ended, its last week.
  const listingWeek = () => {
    const thisMonday = toKey(mondayOf(new Date()));
    const cur = weeksRef.current;
    const keys = [...cur.keys()].sort();
    return cur.has(thisMonday) ? thisMonday : (keys.filter((k) => k <= thisMonday).at(-1) ?? keys.at(-1));
  };

  // Saves each week's changed rows in order. jobs = [[weekKey, Map<taskId, row | null>]]
  const saveJobs = (jobs, failText, after) => {
    chain.current = chain.current.then(async () => {
      try {
        for (const [wk, tasks] of jobs) {
          const id = await saveWeekJob({ userId, weekStart: wk, weekId: weeksRef.current.get(wk)?.weekId, job: { tasks } });
          const w = weeksRef.current.get(wk);
          if (w && !w.weekId) w.weekId = id;
        }
        after?.();
      } catch (e) {
        toast.error(`${failText}: ${e.message}`);
        setReloads((n) => n + 1);
      }
    });
  };

  // Takes a listed habit off the current week and any later week of the month, so it stops
  // carrying over. Earlier weeks keep their marks, so it shows as removed. Returns what was
  // deleted (marks included) for `undoDelete`.
  const deleteHabit = (text) => {
    if (status !== "ready") return null;
    const cur = weeksRef.current;
    const from = listingKey(cur);
    if (!from) return null;
    const next = new Map(cur);
    const deleted = [];
    for (const [wk, w] of cur) {
      if (wk < from) continue;
      const gone = w.tasks.filter((t) => t.text.trim() === text);
      if (!gone.length) continue;
      next.set(wk, { ...w, tasks: w.tasks.filter((t) => t.text.trim() !== text) });
      deleted.push([wk, gone]);
      markCleared(userId, wk);
    }
    if (!deleted.length) return null;
    weeksRef.current = next;
    setWeeks(next);
    saveJobs(
      deleted.map(([wk, gone]) => [wk, new Map(gone.map((t) => [t.id, null]))]),
      "Couldn't delete",
    );
    return deleted;
  };

  const undoDelete = (deleted) => {
    const next = new Map(weeksRef.current);
    for (const [wk, gone] of deleted) {
      const w = next.get(wk);
      if (w) next.set(wk, { ...w, tasks: [...w.tasks, ...gone].sort((a, b) => a.position - b.position) });
    }
    weeksRef.current = next;
    setWeeks(next);
    saveJobs(
      deleted.map(([wk, gone]) => [
        wk,
        new Map(gone.map((t) => [t.id, { position: t.position, text: t.text, days: t.days }])),
      ]),
      "Couldn't restore",
      () => toast.success("Habit restored"),
    );
  };

  // Lists a removed habit again by adding it back to the current week (or, for a month that has
  // ended, its last week). Marks ticked in earlier weeks were never deleted, so they show again.
  const restoreHabit = (text) => {
    if (status !== "ready") return;
    const cur = weeksRef.current;
    const wk = listingWeek();
    const week = cur.get(wk);
    if (week.tasks.some((t) => t.text.trim() === text)) return;
    const last = week.tasks.reduce((m, t) => Math.max(m, t.position), 0);
    const task = { id: uuid(), position: last + STEP, text, days: Array(7).fill(false) };
    const next = new Map(cur).set(wk, { ...week, tasks: [...week.tasks, task] });
    weeksRef.current = next;
    setWeeks(next);
    saveJobs(
      [[wk, new Map([[task.id, { position: task.position, text: task.text, days: task.days }]])]],
      "Couldn't restore",
      () => toast.success("Habit restored"),
    );
  };

  return { days, habits, removed, removeHabit, deleteHabit, undoDelete, restoreHabit, status, isChecked, toggle, retry: () => setReloads((n) => n + 1) };
}
