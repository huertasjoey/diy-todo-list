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
        className="flex h-7 w-7 items-center justify-center rounded-full border border-goal/50 bg-goal-soft text-goal"
      >
        <MoonIcon width={14} height={14} />
      </span>
    ) : (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-muted/60 text-accent-ink transition-all duration-150 hover:border-accent peer-checked:scale-100 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
    >
      {checked && <CheckIcon width={15} height={15} strokeWidth={3} />}
    </span>
    )}
  </label>
  );
};

export default DayBox;
