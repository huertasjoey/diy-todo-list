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
    <section className="notes-card mt-14">
      <h2 id="notes-heading" className="font-display text-[2.5rem] leading-none tracking-tight">
        Notes
      </h2>
      <div className="no-print sheet mt-5 px-6 pb-6 pt-4 sm:px-8">
        <textarea
          ref={ref}
          value={value}
          disabled={disabled}
          maxLength={20000}
          onChange={(e) => onChange(e.target.value)}
          aria-labelledby="notes-heading"
          placeholder="Reminders, ideas, appointments, intentions for the week"
          className="ruled block min-h-48 w-full resize-none bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70"
        />
      </div>
      {/* Print shows this copy instead: it wraps at the page width, so nothing gets clipped */}
      <div className="notes-print print-only mt-2" aria-hidden="true">
        {value}
      </div>
    </section>
  );
};

export default Notes;
