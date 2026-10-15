const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const CheckIcon = (p) => (
  <svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>
);
export const ClockIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const TrashIcon = (p) => (
  <svg {...base} {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>
);
export const PencilIcon = (p) => (
  <svg {...base} {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const ChevronLeftIcon = (p) => (
  <svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>
);
export const ChevronRightIcon = (p) => (
  <svg {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>
);
export const CalendarIcon = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const XIcon = (p) => (
  <svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const PrinterIcon = (p) => (
  <svg {...base} {...p}><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z" /></svg>
);
export const DownloadIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
);
export const UndoIcon = (p) => (
  <svg {...base} {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
);
export const SunIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const MoonIcon = (p) => (
  <svg {...base} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
);
export const StarsIcon = (p) => (
  <svg {...base} {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.2 6.2 0 0 0 10.5 10.5ZM17 3v3M15.5 4.5h3" /></svg>
);
export const ListIcon = (p) => (
  <svg {...base} {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
