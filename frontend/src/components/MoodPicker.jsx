import { MOODS } from "../lib/diary";

// Optional. Picking the same mood again clears it.
const MoodPicker = ({ value, onChange, disabled }) => (
  <fieldset className="min-w-0">
    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
      Mood <span className="font-normal normal-case tracking-normal">(optional)</span>
    </legend>
    <div role="radiogroup" aria-label="Mood" className="flex flex-wrap gap-2">
      {MOODS.map((m) => {
        const on = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(on ? "" : m.id)}
            className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-60 ${
              on
                ? "border-diary bg-diary-soft text-diary"
                : "border-line text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  </fieldset>
);

export default MoodPicker;
