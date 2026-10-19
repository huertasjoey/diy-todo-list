import { supabase } from "./supabase";

// Every diary query is protected by Row Level Security: a query can only ever see the
// signed-in user's own entries, whatever it asks for.

const SUMMARY = "id, entry_date, title, mood, is_draft, word_count, preview, updated_at";
const FULL =
  "id, entry_date, title, content, mood, highlights, challenges, lessons, tomorrow, is_draft, word_count, preview, created_at, updated_at";

const toSummary = (r) => ({
  id: r.id,
  date: r.entry_date,
  title: r.title,
  mood: r.mood,
  isDraft: r.is_draft,
  wordCount: r.word_count,
  preview: r.preview,
  updatedAt: r.updated_at,
});

const toEntry = (r) => ({
  ...toSummary(r),
  content: r.content,
  highlights: r.highlights,
  challenges: r.challenges,
  lessons: r.lessons,
  tomorrow: r.tomorrow,
  createdAt: r.created_at,
});

// a short, typed reason the UI can react to ("exists", "conflict"), plus a human message
const fail = (code, message) => Object.assign(new Error(message), { code });

const PAGE = 1000; // the API returns at most this many rows per request

/** One small row per entry (date, words, draft). Powers the calendar markers and progress charts. */
export const listStats = async () => {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("diary_entries")
      .select("entry_date, word_count, is_draft")
      .order("entry_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data.map((r) => ({ date: r.entry_date, words: r.word_count, draft: r.is_draft })));
    if (data.length < PAGE) return rows;
  }
};

// characters that mean something in a filter expression are removed, so a search can't break the query
const cleanSearch = (s) => s.replace(/[%_\\,()"'*:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
const SEARCH_COLUMNS = ["title", "content", "highlights", "challenges", "lessons", "tomorrow"];

export const listEntries = async ({ search = "", from = "", to = "", mood = "", limit = 30, offset = 0 } = {}) => {
  let query = supabase
    .from("diary_entries")
    .select(SUMMARY)
    .order("entry_date", { ascending: false })
    .range(offset, offset + limit - 1);
  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);
  if (mood) query = query.eq("mood", mood);
  const term = cleanSearch(search);
  if (term) query = query.or(SEARCH_COLUMNS.map((c) => `${c}.ilike.*${term}*`).join(","));
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map(toSummary);
};

export const getEntryByDate = async (date) => {
  const { data, error } = await supabase.from("diary_entries").select(FULL).eq("entry_date", date).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toEntry(data) : null;
};

/** A plain insert: if the date already has an entry it fails instead of overwriting it. */
export const createEntry = async (userId, date, fields) => {
  const { data, error } = await supabase
    .from("diary_entries")
    .insert({ user_id: userId, entry_date: date, ...fields })
    .select(FULL)
    .single();
  if (error) {
    if (error.code === "23505")
      throw fail("exists", "You already have a diary entry for this date. It may have been saved on another device.");
    if (error.code === "23514") throw fail("invalid", "That entry isn't valid. Check the journal text and try again.");
    throw new Error(error.message);
  }
  return toEntry(data);
};

/**
 * Updates only if nobody changed the entry since it was loaded (same updated_at).
 * Otherwise nothing is written, so a second device's edits are never silently overwritten.
 */
export const updateEntry = async (id, expectedUpdatedAt, fields) => {
  const { data, error } = await supabase
    .from("diary_entries")
    .update(fields)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select(FULL);
  if (error) {
    if (error.code === "23514") throw fail("invalid", "That entry isn't valid. Check the journal text and try again.");
    throw new Error(error.message);
  }
  if (!data || data.length === 0)
    throw fail("conflict", "This entry was changed somewhere else, or deleted. Nothing was overwritten. Reload it to see the latest version.");
  return toEntry(data[0]);
};

export const deleteEntry = async (id) => {
  const { error } = await supabase.from("diary_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

/**
 * Asks the writing assistant (a Supabase Edge Function) for help.
 * Only ever called from a button the person pressed.
 */
export const askWritingAssistant = async ({ action, text, style }) => {
  const { data, error } = await supabase.functions.invoke("writing-assist", {
    body: { action, text, style },
  });
  if (error) {
    let info = null;
    try {
      info = await error.context?.json();
    } catch {
      // not a JSON error body (for example a network failure)
    }
    const status = error.context?.status;
    let message = info?.message;
    if (error.name === "FunctionsFetchError" && !info) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      throw Object.assign(
        new Error(
          offline
            ? "You appear to be offline. Check your connection and try again."
            : "Couldn't reach the writing assistant. Most often this means it hasn't been set up on your Supabase project yet (see SETUP.md, “Writing assistant”). If it is set up, check your connection and try again.",
        ),
        { code: offline ? "offline" : "unreachable" },
      );
    }
    if (status === 404)
      message = "The writing assistant hasn't been set up on your Supabase project yet. See SETUP.md, section “Writing assistant”.";
    else if (!message) message = "Couldn't reach the writing assistant. Check your connection and try again.";
    throw Object.assign(new Error(message), { code: info?.error || (status === 404 ? "not_deployed" : "network") });
  }
  if (!data?.result) throw Object.assign(new Error("The assistant sent back an empty answer. Please try again."), { code: "bad_answer" });
  return data.result;
};
