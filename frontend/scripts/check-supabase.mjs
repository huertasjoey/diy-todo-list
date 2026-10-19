// Checks that frontend/.env points at a Supabase project that is ready for the planner.
//   npm run check:supabase
// Uses only the public anon key, the same one the browser uses. Prints no secrets.
import fs from "fs";

const envPath = new URL("../.env", import.meta.url);
if (!fs.existsSync(envPath)) {
  console.log("✗ frontend/.env not found. Copy .env.example to .env and fill in both values.");
  process.exit(1);
}
process.loadEnvFile(envPath);

const url = (process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const key = process.env.VITE_SUPABASE_ANON_KEY || "";
let failed = false;
const pass = (m) => console.log("✓", m);
const fail = (m) => { failed = true; console.log("✗", m); };

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  fail("VITE_SUPABASE_URL should look like https://<project-ref>.supabase.co");
}
if (!key) fail("VITE_SUPABASE_ANON_KEY is empty");

// A legacy JWT key reveals its role. A service_role key must never be in the frontend.
try {
  const role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
  if (role === "service_role") fail("That is the service_role key. It bypasses all security. Use the anon key instead, and rotate the leaked one in Supabase.");
  else if (role === "anon") pass("key is the public anon key");
} catch {
  if (key.startsWith("sb_secret_")) fail("That is a secret key. Use the publishable key (sb_publishable_…) instead.");
  else if (key) pass("key is not a JWT (looks like a publishable key)");
}
if (failed) process.exit(1);

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const get = async (path) => {
  try {
    const r = await fetch(url + path, { headers });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) {
    return { status: 0, body: { message: e.message } };
  }
};

const settings = await get("/auth/v1/settings");
if (settings.status !== 200) {
  fail(`Can't reach the project (${settings.status || "network error"}: ${settings.body.message || settings.body.msg || "check the URL and key"})`);
  process.exit(1);
}
pass("project reachable and the key is accepted");
if (settings.body.disable_signup) fail("Sign-ups are disabled in Auth settings");
else pass("sign-ups are enabled");
if (settings.body.external?.email === false) fail("The email provider is disabled (Authentication → Providers → Email)");
else pass("email provider is enabled");
console.log(
  settings.body.mailer_autoconfirm
    ? "ℹ email confirmation is OFF: new accounts sign in immediately"
    : "ℹ email confirmation is ON: new accounts must click the emailed link first",
);

// Signed out, the tables must exist but refuse to answer (RLS + no anon grants).
for (const table of ["weeks", "week_tasks", "goals", "diary_entries"]) {
  const { status, body } = await get(`/rest/v1/${table}?select=id&limit=1`);
  if (body.code === "PGRST205" || status === 404) {
    fail(`Table "${table}" is missing. Run the matching file from supabase/migrations in the SQL Editor (planner_schema, goals or diary).`);
  } else if (status === 401 || status === 403 || body.code === "42501") {
    pass(`"${table}" exists and refuses signed-out access`);
  } else if (status === 200 && Array.isArray(body) && body.length === 0) {
    fail(`"${table}" answered a signed-out request. Make sure Row Level Security is enabled (re-run the migration).`);
  } else if (status === 200) {
    fail(`"${table}" returned data to a signed-out request. RLS is NOT protecting it. Re-run the migration now.`);
  } else {
    fail(`"${table}" returned an unexpected response (${status}): ${body.message || JSON.stringify(body)}`);
  }
}

// The writing assistant is optional, so this never fails the check. It only says where it stands.
{
  let assist;
  try {
    const r = await fetch(`${url}/functions/v1/writing-assist`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" });
    assist = { status: r.status, body: await r.json().catch(() => ({})) };
  } catch {
    assist = { status: 0, body: {} };
  }
  if (assist.status === 404) console.log("ℹ writing assistant: not deployed yet (optional). See SETUP.md, “Writing assistant”.");
  else if (assist.body.error === "not_configured") console.log("ℹ writing assistant: deployed, but no ANTHROPIC_API_KEY secret is set yet.");
  else if (assist.status === 0) console.log("ℹ writing assistant: couldn't be reached to check.");
  else console.log("✓ writing assistant: deployed (it answered; signed-in checks happen when you use it)");
}

console.log(failed ? "\nNot ready yet. Fix the ✗ items above." : "\nReady. Start the app with npm run dev and register an account.");
process.exit(failed ? 1 : 0);
