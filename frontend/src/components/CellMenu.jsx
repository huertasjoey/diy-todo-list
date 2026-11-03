import { useEffect, useRef } from "react";
import { MoonIcon } from "./Icons";

/**
 * A small menu drawn at the pointer. Closes on Escape, a click elsewhere, scrolling or resizing.
 * Shows `items` ([{ label, icon, onSelect, danger }]), or else the rest-day toggle (`rest`, `onToggle`).
 */
const CellMenu = ({ x, y, title, rest, onToggle, items, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el?.querySelector("button")?.focus();
    const close = () => onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    const onDown = (e) => !el?.contains(e.target) && onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  const list = items ?? [
    { label: rest ? "Remove rest day" : "Set as rest day", icon: MoonIcon, onSelect: onToggle },
  ];

  // keep it on screen
  const left = Math.max(8, Math.min(x, window.innerWidth - 232));
  const top = Math.max(8, Math.min(y, window.innerHeight - 66 - 44 * list.length));

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={title}
      style={{ left, top }}
      className="no-print fixed z-50 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg"
    >
      <p className="truncate px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      {list.map(({ label, icon: Icon, onSelect, danger }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelect();
            onClose();
          }}
          className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors ${
            danger ? "text-danger hover:bg-danger/10" : "hover:bg-surface-2"
          }`}
        >
          {Icon && <Icon width={16} height={16} aria-hidden="true" />} {label}
        </button>
      ))}
    </div>
  );
};

export default CellMenu;
