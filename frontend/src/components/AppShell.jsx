import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import AccountMenu from "./AccountMenu";
import { BookIcon, CalendarIcon, CheckIcon, SparklesIcon } from "./Icons";
import ThemeSwitcher from "./ThemeSwitcher";

const link = ({ isActive }) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors sm:px-4 ${
    isActive ? "bg-accent-soft text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
  }`;

/** The top bar every signed-in page shares: the name, the two sections, theme and account. */
const AppShell = ({ onSignOut, children }) => {
  const { user, displayName, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <h1 className="flex items-center gap-3 font-display text-2xl leading-none">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-ink max-[339px]:hidden"
            >
              <CheckIcon width={16} height={16} strokeWidth={3} />
            </span>
            <span className="hidden sm:inline">Kaizen</span>
            <span className="sr-only sm:hidden">Kaizen</span>
          </h1>
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink to="/" end className={link}>
              <CalendarIcon width={16} height={16} aria-hidden="true" />
              <span className="max-[439px]:sr-only">Planner</span>
            </NavLink>
            <NavLink to="/diary" className={link}>
              <BookIcon width={16} height={16} aria-hidden="true" />
              <span className="max-[439px]:sr-only">Diary</span>
            </NavLink>
            <NavLink to="/mantra" className={link}>
              <SparklesIcon width={16} height={16} aria-hidden="true" />
              <span className="max-[439px]:sr-only">Mantra</span>
            </NavLink>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeSwitcher />
          <AccountMenu user={user} displayName={displayName} onSignOut={onSignOut ?? (() => signOut())} />
        </div>
      </header>
      {children}
    </div>
  );
};

export default AppShell;
