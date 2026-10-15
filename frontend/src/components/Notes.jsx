import { useLayoutEffect, useRef } from "react";

const Notes = ({ value, onChange, disabled }) => {
  const ref = useRef(null);

  // Grow with the text so nothing hides behind a scrollbar.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <section className="notes-card mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2
        id="notes-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        Notes
      </h2>
      <textarea
        ref={ref}
        value={value}
        disabled={disabled}
        maxLength={20000}
        onChange={(e) => onChange(e.target.value)}
        aria-labelledby="notes-heading"
        placeholder="Reminders, ideas, appointments, goals for the week"
        className="no-print mt-3 block min-h-36 w-full resize-none bg-transparent text-[15px] leading-7 text-ink outline-none placeholder:text-muted/70"
      />
      {/* Print shows this copy instead: it wraps at the page width, so nothing gets clipped */}
      <div className="notes-print print-only mt-2" aria-hidden="true">
        {value}
      </div>
    </section>
  );
};

export default Notes;
