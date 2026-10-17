import { createClient } from "@supabase/supabase-js";

// Settings pasted into a host's dashboard often pick up spaces or quotes. Those are safe to strip.
const clean = (value) => (value || "").trim().replace(/^["']|["']$/g, "").trim();

const url = clean(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, "");
const anonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Says what is wrong with the settings, or null when they look usable.
const findProblem = () => {
  if (!url && !anonKey) return { missing: true, message: "No Supabase settings were found in this build." };
  if (!url) return { message: "VITE_SUPABASE_URL is missing." };
  if (!anonKey) return { message: "VITE_SUPABASE_ANON_KEY is missing." };
  // https everywhere; plain http only for a Supabase running on this machine
  if (!/^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(url))
    return { message: "VITE_SUPABASE_URL should look like https://your-project-ref.supabase.co with nothing after it." };
  // a header value can only hold plain printable ASCII; anything else (such as the "…" character
  // from a shortened key, or a stray space inside it) makes every request fail
  if (/[^\x21-\x7e]/.test(anonKey))
    return {
      message:
        "VITE_SUPABASE_ANON_KEY contains a character that isn't allowed, such as … or a space. " +
        "Copy the full key again from Supabase (Project Settings → API) and paste it with nothing added.",
    };
  return null;
};

export const configProblem = findProblem();
export const isConfigured = configProblem === null;

// Only the public anon key is used here. What each user can reach is decided
// by the Row Level Security policies in supabase/migrations, not by this key.
export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
