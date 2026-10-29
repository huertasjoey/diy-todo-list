import { useRef } from "react";

const HOLD_MS = 500;

/**
 * Opens a menu for a checkbox with a right-click, the keyboard's menu key, or a long press on a
 * touch screen. `open(x, y)` gets the spot to draw the menu at.
 */
export default function useCellMenu(open) {
  const timer = useRef(null);
  const held = useRef(false);
  const start = useRef(null);

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    onContextMenu: (e) => {
      e.preventDefault();
      // the menu key reports no pointer position, so draw it beside the box itself
      if (e.clientX === 0 && e.clientY === 0) {
        const r = e.currentTarget.getBoundingClientRect();
        open(r.left + r.width / 2, r.bottom);
      } else open(e.clientX, e.clientY);
    },
    onTouchStart: (e) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
      held.current = false;
      cancel();
      timer.current = setTimeout(() => {
        held.current = true;
        open(start.current.x, start.current.y);
      }, HOLD_MS);
    },
    onTouchMove: (e) => {
      const t = e.touches[0];
      if (start.current && Math.hypot(t.clientX - start.current.x, t.clientY - start.current.y) > 10) cancel();
    },
    onTouchEnd: (e) => {
      cancel();
      // a long press opened the menu, so it must not also tick the box
      if (held.current) {
        e.preventDefault();
        held.current = false;
      }
    },
    onTouchCancel: cancel,
  };
}
