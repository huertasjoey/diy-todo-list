import { useEffect, useRef } from "react";

const ConfirmDialog = ({ open, title, children, confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel }) => {
  const ref = useRef(null);
  // The browser reports a close a moment AFTER dialog.close(). When our own code did the closing,
  // that late report must not count as the person cancelling (it could cancel a newer dialog).
  const closedByUs = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closedByUs.current = true;
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        if (closedByUs.current) {
          closedByUs.current = false;
          return;
        }
        onCancel();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line bg-surface p-7 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <h2 id="confirm-title" className="font-display text-3xl leading-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">{children}</p>
      <div className="mt-7 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="min-h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-surface-2"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-11 cursor-pointer rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
