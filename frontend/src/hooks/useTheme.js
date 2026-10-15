import { useCallback, useState } from "react";

export const THEMES = ["light", "dark", "night"];
const KEY = "habit-theme";

const current = () => {
  const t = document.documentElement.dataset.theme;
  return THEMES.includes(t) ? t : "light";
};

// The theme is a per-device display preference, so it lives in localStorage
// (index.html applies it before first paint). Planner data never goes there.
export default function useTheme() {
  const [theme, setThemeState] = useState(current);

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private mode or blocked storage: the theme still applies for this visit
    }
    setThemeState(next);
  }, []);

  return [theme, setTheme];
}
