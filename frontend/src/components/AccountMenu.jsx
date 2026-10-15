import { useEffect, useRef, useState } from "react";

const initialsOf = (name) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

const menuItem =
  "block min-h-11 w-full cursor-pointer px-4 text-left text-sm transition-colors hover:bg-surface-2";

const AccountMenu = ({ user, displayName, onSignOut }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-3 text-sm transition-colors hover:bg-surface-2"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
        >
          {initialsOf(displayName)}
        </span>
        <span className="hidden max-w-[10rem] truncate font-medium sm:inline">{displayName}</span>
        <span className="sr-only sm:hidden">Account: {displayName}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-xl shadow-black/10"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <button type="button" role="menuitem" className={menuItem} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
