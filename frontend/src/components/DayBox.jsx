import useCellMenu from "../hooks/useCellMenu";
import { CheckIcon, MoonIcon } from "./Icons";

// A circle you tick. The real checkbox is visually hidden but stays keyboard and
// screen-reader accessible; the label gives it a 44px tap area.
const DayBox = ({ checked, onChange, label, disabled, onMenu, off = false }) => {
  const menu = useCellMenu((x, y) => onMenu?.(x, y));
  return (
  <label
    className="relative flex h-14 w-full cursor-pointer items-center justify-center has-[:disabled]:cursor-default"
    {...(onMenu ? menu : {})}
  >
    <input
      type="checkbox"
      className="peer sr-only"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
    />
    {off ? (
      <span
        aria-hidden="true"
        title="Rest day"
        className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-goal-soft text-goal"
      >
        <MoonIcon width={14} height={14} />
      </span>
    ) : (
    <span
      aria-hidden="true"
      className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-muted/35 text-accent-ink transition-all duration-200 hover:border-accent hover:bg-accent-soft/60 peer-checked:border-accent peer-checked:bg-accent peer-checked:shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--accent)_60%,transparent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
    >
      {checked && <CheckIcon width={14} height={14} strokeWidth={3} />}
    </span>
    )}
  </label>
  );
};

export default DayBox;
