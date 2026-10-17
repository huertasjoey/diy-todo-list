import { CheckIcon } from "./Icons";

// A circle you tick. The real checkbox is visually hidden but stays keyboard and
// screen-reader accessible; the label gives it a 44px tap area.
const DayBox = ({ checked, onChange, label, disabled }) => (
  <label className="relative flex h-14 w-full cursor-pointer items-center justify-center has-[:disabled]:cursor-default">
    <input
      type="checkbox"
      className="peer sr-only"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
    />
    <span
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-muted/60 text-accent-ink transition-all duration-150 hover:border-accent peer-checked:scale-100 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
    >
      {checked && <CheckIcon width={15} height={15} strokeWidth={3} />}
    </span>
  </label>
);

export default DayBox;
