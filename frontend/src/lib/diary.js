import { addDays, parseKey, toKey } from "./dates";

export const MAX_TITLE = 200;
export const MAX_CONTENT = 50000;
export const MAX_REFLECTION = 5000;

// plain words, no icons: the mood is something you pick, not a score
export const MOODS = [
  { id: "happy", label: "Happy" },
  { id: "productive", label: "Productive" },
  { id: "grateful", label: "Grateful" },
  { id: "calm", label: "Calm" },
  { id: "tired", label: "Tired" },
  { id: "sad", label: "Sad" },
  { id: "anxious", label: "Anxious" },
  { id: "frustrated", label: "Frustrated" },
];
export const moodLabel = (id) => MOODS.find((m) => m.id === id)?.label ?? "";

export const REFLECTIONS = [
  { key: "highlights", label: "Daily highlights", hint: "What went well today?" },
  { key: "challenges", label: "Challenges", hint: "What difficulties did I face?" },
  { key: "lessons", label: "Lessons learned", hint: "What did I learn today?" },
  { key: "tomorrow", label: "Tomorrow's plan", hint: "What do I want to accomplish tomorrow?" },
];

export const wordCount = (text) => {
  const t = (text || "").trim();
  return t === "" ? 0 : t.split(/\s+/).length;
};

/** Everything written in the entry (the title is not counted). */
export const entryWordCount = (v) =>
  wordCount(v.content) + REFLECTIONS.reduce((n, r) => n + wordCount(v[r.key]), 0);

export const previewOf = (content) => (content || "").replace(/\s+/g, " ").trim().slice(0, 200);

export const blankValues = () => ({
  title: "",
  content: "",
  mood: "",
  highlights: "",
  challenges: "",
  lessons: "",
  tomorrow: "",
});

export const valuesFromEntry = (e) => ({
  title: e.title,
  content: e.content,
  mood: e.mood || "",
  highlights: e.highlights,
  challenges: e.challenges,
  lessons: e.lessons,
  tomorrow: e.tomorrow,
});

export const sameValues = (a, b) => Object.keys(blankValues()).every((k) => a[k] === b[k]);

const isRealDate = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key) && toKey(parseKey(key)) === key;
export const isValidDateKey = isRealDate;

/**
 * Only the date and (for a finished entry) the journal are required.
 * A draft can be saved half-written.
 */
export const validateEntry = (values, date, todayKey, isDraft) => {
  const e = {};
  if (!isRealDate(date)) e.date = "Choose a valid date.";
  else if (date > todayKey) e.date = "You can't write a diary entry for a future date.";

  if (values.title.length > MAX_TITLE) e.title = `Keep the title to ${MAX_TITLE} characters or fewer.`;
  if (!isDraft && values.content.trim() === "")
    e.content = "Write something in your journal first, or save it as a draft.";
  if (values.content.length > MAX_CONTENT) e.content = "That's too long for one entry. Split it across two days.";
  for (const r of REFLECTIONS)
    if (values[r.key].length > MAX_REFLECTION) e[r.key] = `Keep this to ${MAX_REFLECTION} characters or fewer.`;
  return e;
};

/** Values -> what gets stored. The writing itself is stored exactly as typed. */
export const fieldsFromValues = (values, isDraft) => ({
  title: values.title.trim(),
  content: values.content,
  mood: values.mood || null,
  highlights: values.highlights,
  challenges: values.challenges,
  lessons: values.lessons,
  tomorrow: values.tomorrow,
  is_draft: isDraft,
  word_count: entryWordCount(values),
  preview: previewOf(values.content),
});

// ------------------------------------------------------------ writing progress

const consecutive = (dates, from) => {
  let n = 0;
  for (let d = parseKey(from); dates.has(toKey(d)); d = addDays(d, -1)) n += 1;
  return n;
};

/** Days in a row with a saved entry, ending today (or yesterday, if today isn't written yet). */
export const currentStreak = (dates, todayKey) => {
  const yesterday = toKey(addDays(parseKey(todayKey), -1));
  if (dates.has(todayKey)) return consecutive(dates, todayKey);
  if (dates.has(yesterday)) return consecutive(dates, yesterday);
  return 0;
};

const countForward = (dates, start) => {
  let n = 0;
  for (let d = parseKey(start); dates.has(toKey(d)); d = addDays(d, 1)) n += 1;
  return n;
};

/** The longest run of consecutive days with a saved entry, ever. */
export const longestStreak = (dates) => {
  let best = 0;
  for (const key of dates) {
    // only start counting at the first day of a run
    if (!dates.has(toKey(addDays(parseKey(key), -1)))) best = Math.max(best, countForward(dates, key));
  }
  return best;
};

export const heatLevel = (words) => (words <= 0 ? 0 : words < 100 ? 1 : words < 250 ? 2 : words < 500 ? 3 : 4);

export const HEAT_WEEKS = 26;

/**
 * rows: [{ date, words, draft }]. Only saved (non-draft) entries count as writing done.
 * This measures how much you write, not how good the English is.
 */
export const computeStats = (rows, todayKey) => {
  const saved = rows.filter((r) => !r.draft);
  const words = new Map(saved.map((r) => [r.date, r.words]));
  const dates = new Set(words.keys());
  const totalWords = saved.reduce((n, r) => n + r.words, 0);
  const today = parseKey(todayKey);

  // the last 7 days, oldest first
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = toKey(addDays(today, i - 6));
    return { date, words: words.get(date) ?? 0, wrote: dates.has(date) };
  });

  // 26 Monday-first week columns ending with the current week
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const heat = Array.from({ length: HEAT_WEEKS }, (_, w) => {
    const start = addDays(monday, (w - (HEAT_WEEKS - 1)) * 7);
    return Array.from({ length: 7 }, (_, d) => {
      const date = toKey(addDays(start, d));
      const future = date > todayKey;
      const w2 = words.get(date) ?? 0;
      return { date, words: w2, level: future ? 0 : heatLevel(w2), future, wrote: dates.has(date) };
    });
  });

  return {
    entries: saved.length,
    drafts: rows.length - saved.length,
    totalWords,
    averageWords: saved.length ? Math.round(totalWords / saved.length) : 0,
    streak: currentStreak(dates, todayKey),
    longest: longestStreak(dates),
    last7,
    heat,
    wroteToday: dates.has(todayKey),
  };
};
