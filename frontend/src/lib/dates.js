export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

const pad = (n) => String(n).padStart(2, "0");

// Local calendar date as YYYY-MM-DD (never goes through UTC, so it can't shift a day).
export const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (date, n) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
};

// Weeks run Monday to Sunday.
export const mondayOf = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(d, -((d.getDay() + 6) % 7));
};

export const weekDates = (monday) =>
  Array.from({ length: 7 }, (_, i) => addDays(monday, i));

const MONTH = new Intl.DateTimeFormat(undefined, { month: "short" });

// "Oct 12 – Oct 18"
export const formatRange = (monday) => {
  const sunday = addDays(monday, 6);
  const a = `${MONTH.format(monday)} ${monday.getDate()}`;
  const b = `${MONTH.format(sunday)} ${sunday.getDate()}`;
  return `${a} – ${b}`;
};

// A week can straddle New Year; show both years then.
export const formatYear = (monday) => {
  const start = monday.getFullYear();
  const end = addDays(monday, 6).getFullYear();
  return start === end ? String(start) : `${start} / ${end}`;
};

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ISO 8601 week number (weeks start Monday; week 1 contains the first Thursday).
export const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

// 42 days (6 Monday-first weeks) covering the month that `date` is in.
export const monthGrid = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = mondayOf(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};
