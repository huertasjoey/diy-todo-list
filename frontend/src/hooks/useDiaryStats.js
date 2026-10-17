import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeStats } from "../lib/diary";
import { listStats } from "../lib/diaryDb";

/**
 * One light row per diary entry: enough for the calendar markers and the progress charts.
 * Used by the planner (calendar markers) and by the diary pages. Status: loading | ready | error
 */
export default function useDiaryStats(userId, todayKey) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const rowsRef = useRef(rows);

  const apply = useCallback((next) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await listStats());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [apply]);

  useEffect(() => {
    load();
  }, [load, userId]);

  // another tab or device may have written something: look again when this one regains focus
  useEffect(() => {
    const refresh = async () => {
      try {
        const next = await listStats();
        if (JSON.stringify(next) !== JSON.stringify(rowsRef.current)) apply(next);
      } catch {
        // a failed background refresh is not worth interrupting anyone for
      }
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [apply]);

  // keep the markers right the moment an entry is saved or deleted here, without another request
  const upsert = useCallback(
    (entry) =>
      apply([
        ...rowsRef.current.filter((r) => r.date !== entry.date),
        { date: entry.date, words: entry.wordCount, draft: entry.isDraft },
      ].sort((a, b) => a.date.localeCompare(b.date))),
    [apply],
  );
  const remove = useCallback((date) => apply(rowsRef.current.filter((r) => r.date !== date)), [apply]);

  const stats = useMemo(() => computeStats(rows, todayKey), [rows, todayKey]);
  // date -> { draft, words }: what the calendars draw their diary markers from
  const byDate = useMemo(() => new Map(rows.map((r) => [r.date, { draft: r.draft, words: r.words }])), [rows]);

  return { rows, status, stats, byDate, reload: () => { setStatus("loading"); load(); }, upsert, remove };
}
