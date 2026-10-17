import { useCallback, useEffect, useRef, useState } from "react";
import { deleteGoal, listGoals, saveGoal } from "../lib/plannerDb";
import { uuid } from "../lib/uuid";

const signature = (goals) => JSON.stringify(goals);

/**
 * All of the signed-in user's goals. Loaded once, so they stay on the calendar while
 * you move between weeks and months. Status: loading | ready | error
 */
export default function useGoals(userId) {
  const [goals, setGoals] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const goalsRef = useRef(goals);
  const busy = useRef(0); // writes in flight; a background refresh waits for them

  const apply = useCallback((next) => {
    goalsRef.current = next;
    setGoals(next);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await listGoals());
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, [apply]);

  useEffect(() => {
    load();
  }, [load]);

  // Pick up changes made on another device when this tab regains focus.
  useEffect(() => {
    const refresh = async () => {
      if (busy.current || status !== "ready") return;
      try {
        const next = await listGoals();
        if (!busy.current && signature(next) !== signature(goalsRef.current)) apply(next);
      } catch {
        // a failed background refresh is not worth interrupting anyone for
      }
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [status, apply]);

  const retry = () => {
    setStatus("loading");
    load();
  };

  const write = async (task) => {
    busy.current += 1;
    try {
      return await task();
    } finally {
      busy.current -= 1;
    }
  };

  // The id exists before the request (the form passes the one it made when it opened), so a retry
  // or a double click updates the same row instead of adding a second goal.
  const create = (values, id = uuid()) =>
    write(async () => {
      const saved = await saveGoal(userId, { ...values, id });
      apply([...goalsRef.current.filter((g) => g.id !== saved.id), saved]);
      return saved;
    });

  const update = (id, values) =>
    write(async () => {
      const saved = await saveGoal(userId, { ...values, id });
      apply(goalsRef.current.map((g) => (g.id === id ? saved : g)));
      return saved;
    });

  const remove = (id) =>
    write(async () => {
      await deleteGoal(id);
      apply(goalsRef.current.filter((g) => g.id !== id));
    });

  return { goals, status, error, retry, create, update, remove };
}
