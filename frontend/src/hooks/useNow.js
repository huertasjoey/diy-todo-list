import { useEffect, useState } from "react";

// The current date and time, kept live. It only changes (and re-renders) when the
// minute does, which also means a new day or week is picked up the moment it starts.
export default function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const sync = () =>
      setNow((prev) => {
        const next = new Date();
        return next.getMinutes() === prev.getMinutes() &&
          next.getDate() === prev.getDate() &&
          next.getHours() === prev.getHours()
          ? prev
          : next;
      });

    const id = setInterval(sync, 1000);
    // timers are throttled in background tabs, so resync as soon as the tab is back
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return now;
}
