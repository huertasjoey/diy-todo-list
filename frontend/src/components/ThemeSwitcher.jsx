import useTheme from "../hooks/useTheme";
import { MoonIcon, StarsIcon, SunIcon } from "./Icons";

const OPTIONS = [
  { id: "light", label: "Light", Icon: SunIcon },
  { id: "dark", label: "Dark", Icon: MoonIcon },
  { id: "night", label: "Night", Icon: StarsIcon },
];

const ThemeSwitcher = () => {
  const [theme, setTheme] = useTheme();

  // arrow keys move between options, like a native radio group
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = OPTIONS.findIndex((o) => o.id === e.currentTarget.dataset.themeOption);
    const next = OPTIONS[(i + step + OPTIONS.length) % OPTIONS.length];
    setTheme(next.id);
    e.currentTarget.parentElement.querySelector(`[data-theme-option="${next.id}"]`)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="no-print inline-flex items-center rounded-full border border-line bg-surface p-0.5"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} mode`}
            data-theme-option={id}
            tabIndex={active ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => setTheme(id)}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
              active ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
            }`}
          >
            <Icon width={17} height={17} />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;
