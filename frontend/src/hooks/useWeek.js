import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { loadWeek, saveWeekJob } from "../lib/plannerDb";

export const MIN_ROWS = 15;
const SAVE_DELAY = 500;
const STEP = 1000;

// RFC 4122 v4 id. Rows get their id on the client so a retried save can never create a duplicate.
const uuid = () => {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const blankTask = (position) => ({
  id: uuid(),
  position,
  text: "",
  days: Array(7).fill(false),
});

// Empty writing lines are only padding; they are never stored.
const isUsed = (t) => t.text.trim() !== "" || t.days.some(Boolean);

// What gets written for a row: its data, or null when it's empty again (delete it).
const snapshot = (t) =>
  isUsed(t) ? { position: t.position, text: t.text, days: t.days } : null;

const padRows = (tasks) => {
  const rows = [...tasks];
  let last = rows.length ? rows[rows.length - 1].position : 0;
  while (rows.length < MIN_ROWS) {
    last += STEP;
    rows.push(blankTask(last));
  }
  return rows;
};

const signature = (w) =>
  JSON.stringify([
    w.notes,
    w.tasks.filter(isUsed).map((t) => [t.id, t.position, t.text, t.days]),
  ]);

// Changes waiting to be saved for one week. A newer change to the same field wins.
const mergeJobs = (older, newer) => ({
  notes: newer.notes !== undefined ? newer.notes : older.notes,
  tasks: new Map([...older.tasks, ...newer.tasks]),
});

/**
 * Loads one planner week from Supabase and autosaves edits, one changed row at a time.
 * Statuses: loading | loadError | saved | saving | saveError
 */
export default function useWeek(weekKey, userId) {
  const [week, setWeek] = useState(() => ({ tasks: padRows([]), notes: "" }));
  const [status, setStatus] = useState("loading");
  const [reloads, setReloads] = useState(0);

  const weekRef = useRef(week);
  const keyRef = useRef(weekKey);
  const readyRef = useRef(false);
  const weekIds = useRef(new Map()); // weekKey -> database id
  const pending = useRef(new Map()); // weekKey -> job waiting to be saved
  const timer = useRef(null);
  const inflight = useRef(Promise.resolve());
  const busy = useRef(0);

  // Sends everything waiting. Writes are chained so they reach the database in order.
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;

    const jobs = [...pending.current];
    pending.current = new Map();
    if (jobs.length === 0) return inflight.current;

    setStatus("saving");
    busy.current += 1;
    inflight.current = inflight.current.then(async () => {
      let failure = null;
      for (const [key, job] of jobs) {
        try {
          const id = await saveWeekJob({
            userId,
            weekStart: key,
            weekId: weekIds.current.get(key),
            job,
          });
          weekIds.current.set(key, id);
        } catch (error) {
          failure = error;
          // keep it for a retry; anything edited since then takes precedence
          const newer = pending.current.get(key);
          pending.current.set(key, newer ? mergeJobs(job, newer) : job);
        }
      }
      busy.current -= 1;
      if (failure) {
        setStatus("saveError");
        toast.error(`Couldn't save: ${failure.message}. Your changes are kept here, retry in a moment.`);
      } else if (pending.current.size === 0) {
        setStatus("saved");
      }
    });
    return inflight.current;
  }, [userId]);

  const schedule = useCallback(
    (key, job) => {
      const existing = pending.current.get(key);
      pending.current.set(key, existing ? mergeJobs(existing, job) : job);
      setStatus("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY);
    },
    [flush],
  );

  // Load a week. Pending saves go out first so going back to a week never shows stale data.
  useEffect(() => {
    keyRef.current = weekKey;
    readyRef.current = false;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      await flush();
      try {
        const data = await loadWeek(weekKey);
        if (cancelled) return;
        if (data.weekId) weekIds.current.set(weekKey, data.weekId);
        const next = { tasks: padRows(data.tasks), notes: data.notes };
        weekRef.current = next;
        setWeek(next);
        readyRef.current = true;
        setStatus("saved");
      } catch (error) {
        if (cancelled) return;
        setStatus("loadError");
        toast.error(error.message);
      }
    })();

    return () => {
      cancelled = true;
      flush();
    };
  }, [weekKey, reloads, flush]);

  // Quietly pick up changes made on another device or tab when this one regains focus.
  // Skipped while anything here is unsaved, so it can never overwrite an edit in progress.
  const refresh = useCallback(async () => {
    if (!readyRef.current || pending.current.size || busy.current) return;
    const key = keyRef.current;
    try {
      const data = await loadWeek(key);
      if (key !== keyRef.current || !readyRef.current || pending.current.size || busy.current)
        return;
      const next = { tasks: padRows(data.tasks), notes: data.notes };
      if (signature(next) === signature(weekRef.current)) return;
      if (data.weekId) weekIds.current.set(key, data.weekId);
      weekRef.current = next;
      setWeek(next);
    } catch {
      // a failed background refresh is not worth interrupting anyone for
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
      else flush();
    };
    const onBeforeUnload = (e) => {
      if (pending.current.size || busy.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("focus", refresh);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flush, refresh]);

  // Edits are ignored until the week has loaded, so a failed load can never overwrite saved data.
  const commit = (next, job) => {
    weekRef.current = next;
    setWeek(next);
    if (job) schedule(keyRef.current, job);
  };

  const updateTask = (id, change) => {
    if (!readyRef.current) return;
    const w = weekRef.current;
    let updated = null;
    const tasks = w.tasks.map((t) => (t.id === id ? (updated = change(t)) : t));
    if (!updated) return;
    commit({ ...w, tasks }, { tasks: new Map([[id, snapshot(updated)]]) });
  };

  const setText = (id, text) => updateTask(id, (t) => ({ ...t, text }));

  const toggleDay = (id, day) =>
    updateTask(id, (t) => ({ ...t, days: t.days.map((v, i) => (i === day ? !v : v)) }));

  const clearMarks = (id) => updateTask(id, (t) => ({ ...t, days: Array(7).fill(false) }));

  const deleteTask = (id) => {
    if (!readyRef.current) return;
    const w = weekRef.current;
    commit(
      { ...w, tasks: padRows(w.tasks.filter((t) => t.id !== id)) },
      { tasks: new Map([[id, null]]) },
    );
  };

  // Inserts an empty row after `afterId` (or at the end) and returns its id.
  // An empty row isn't stored; it is saved the moment something is written on it.
  const addTask = (afterId) => {
    if (!readyRef.current) return null;
    const w = weekRef.current;
    const at = afterId ? w.tasks.findIndex((t) => t.id === afterId) + 1 : w.tasks.length;
    const before = at > 0 ? w.tasks[at - 1].position : 0;
    const after = w.tasks[at]?.position;
    const task = blankTask(after === undefined ? before + STEP : (before + after) / 2);
    const tasks = [...w.tasks];
    tasks.splice(at, 0, task);
    commit({ ...w, tasks }, null);
    return task.id;
  };

  const setNotes = (notes) => {
    if (!readyRef.current) return;
    commit({ ...weekRef.current, notes }, { notes, tasks: new Map() });
  };

  const resetCompletions = () => {
    if (!readyRef.current) return;
    const w = weekRef.current;
    const job = { tasks: new Map() };
    const tasks = w.tasks.map((t) => {
      if (!t.days.some(Boolean)) return t;
      const cleared = { ...t, days: Array(7).fill(false) };
      job.tasks.set(t.id, snapshot(cleared));
      return cleared;
    });
    commit({ ...w, tasks }, job);
  };

  return {
    tasks: week.tasks,
    notes: week.notes,
    status,
    ready: status === "saved" || status === "saving" || status === "saveError",
    setText,
    toggleDay,
    clearMarks,
    deleteTask,
    addTask,
    setNotes,
    resetCompletions,
    flush,
    retryLoad: () => setReloads((n) => n + 1),
    retrySave: flush,
  };
}
