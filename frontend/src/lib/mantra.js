// A small library of mantras, plus a per-user list of their own kept in this browser.

export const MANTRAS = [
  "Small steps, every day.",
  "I am becoming who I practise being.",
  "Progress, not perfection.",
  "One calm breath, one clear next step.",
  "I do the work, and I trust the process.",
  "Today is enough, and so am I.",
  "Consistency is my quiet superpower.",
  "I begin where I am.",
  "Discipline is a form of self-respect.",
  "Slow is smooth, smooth is steady.",
  "I choose focus over hurry.",
  "Every day I get a little better.",
  "I let go of what I cannot control.",
  "Show up, even when it's hard.",
  "My habits shape my future.",
];

export const TARGETS = [9, 21, 54, 108];

const MAX_LEN = 140;
const MAX_MINE = 50;
const keyFor = (userId) => `kaizen.mantras.${userId}`;

/** The same mantra all day, changing at midnight. `offset` lets "another" step past it. */
export const mantraForDay = (dayKey, list, offset = 0) => {
  let h = 0;
  for (const ch of dayKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[(h + offset) % list.length];
};

export const cleanMantra = (s) => s.replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
export const MANTRA_MAX_LEN = MAX_LEN;
export const MANTRA_MAX_MINE = MAX_MINE;

// localStorage can be blocked or full, so every access is guarded and the page still works without it
export const loadMine = (userId) => {
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(userId)) || "null");
    const mine = Array.isArray(raw?.mine)
      ? raw.mine.filter((m) => m && typeof m.id === "string" && typeof m.text === "string").slice(0, MAX_MINE)
      : [];
    return { mine, pinned: mine.some((m) => m.id === raw?.pinned) ? raw.pinned : null };
  } catch {
    return { mine: [], pinned: null };
  }
};

export const saveMine = (userId, state) => {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
