import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { dayAfter, forDay, nextPosition, validateTask } from "../lib/dayTasks";
import { createTask, deleteTask, listTasks, updateTask } from "../lib/dayTasksDb";
import { uuid } from "../lib/uuid";

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Today's tasks and the optional list for tomorrow. Changes show up straight away and are
 * undone with a message if saving fails. When the date changes (midnight), tomorrow's
 * list simply becomes today's, because tasks belong to dates. Status: loading | ready | error
 */
export default function useDayTasks(userId, todayKey) {
  const tomorrowKey = dayAfter(todayKey);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const tasksRef = useRef(tasks);
  const busy = useRef(0); // saves in flight; a background refresh waits for them
  const latest = useRef(0);

  const apply = useCallback((next) => {
    tasksRef.current = next;
    setTasks(next);
  }, []);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const rows = await listTasks(todayKey, tomorrowKey);
      if (mine !== latest.current) return;
      apply(rows);
      setStatus("ready");
    } catch (e) {
      if (mine !== latest.current) return;
      setError(e.message);
      setStatus("error");
    }
  }, [todayKey, tomorrowKey, apply]);

  // loads on first view, and again whenever the date changes
  useEffect(() => {
    load();
  }, [load]);

  // pick up changes from another device when this tab regains focus
  useEffect(() => {
    const refresh = async () => {
      if (busy.current || status !== "ready") return;
      try {
        const rows = await listTasks(todayKey, tomorrowKey);
        if (!busy.current && !sameList(rows, tasksRef.current)) apply(rows);
      } catch {
        // a failed background refresh is not worth interrupting anyone for
      }
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [status, todayKey, tomorrowKey, apply]);

  const retry = () => {
    setStatus("loading");
    load();
  };

  const track = async (work) => {
    busy.current += 1;
    try {
      return await work();
    } finally {
      busy.current -= 1;
    }
  };

  const replace = (id, patch) => apply(tasksRef.current.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  /** Resolves to an error message, or null when it worked. */
  const add = async (date, text) => {
    const existing = forDay(tasksRef.current, date);
    const problem = validateTask(text, existing.length);
    if (problem) return problem;
    const task = {
      id: uuid(),
      date,
      text: text.trim(),
      done: false,
      position: nextPosition(existing),
      createdAt: new Date().toISOString(),
    };
    apply([...tasksRef.current, task]); // shown at once
    try {
      const saved = await track(() => createTask(userId, task));
      replace(task.id, saved);
      return null;
    } catch (e) {
      apply(tasksRef.current.filter((t) => t.id !== task.id)); // undo
      return e.message;
    }
  };

  const toggle = async (id) => {
    const before = tasksRef.current.find((t) => t.id === id);
    if (!before) return;
    replace(id, { done: !before.done });
    try {
      await track(() => updateTask(id, { done: !before.done }));
    } catch (e) {
      replace(id, { done: before.done });
      toast.error(e.message);
      if (e.code === "gone") load();
    }
  };

  /** Resolves to an error message, or null when it worked. */
  const edit = async (id, text) => {
    const before = tasksRef.current.find((t) => t.id === id);
    if (!before) return null;
    const problem = validateTask(text, 0, { editing: true });
    if (problem) return problem;
    if (text.trim() === before.text) return null;
    replace(id, { text: text.trim() });
    try {
      await track(() => updateTask(id, { text: text.trim() }));
      return null;
    } catch (e) {
      replace(id, { text: before.text });
      if (e.code === "gone") load();
      return e.message;
    }
  };

  const remove = async (id) => {
    const index = tasksRef.current.findIndex((t) => t.id === id);
    if (index < 0) return;
    const before = tasksRef.current[index];
    apply(tasksRef.current.filter((t) => t.id !== id));
    try {
      await track(() => deleteTask(id));
    } catch (e) {
      const next = [...tasksRef.current];
      next.splice(Math.min(index, next.length), 0, before);
      apply(next);
      toast.error(e.message);
    }
  };

  return { tasks, status, error, retry, todayKey, tomorrowKey, add, toggle, edit, remove };
}
