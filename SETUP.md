# Setup: accounts + cloud database (Supabase)

The planner signs people in with Supabase Auth and stores every user's weeks in a
Supabase Postgres database. Row Level Security makes each account's rows
reachable only by that account. MongoDB is gone. The browser talks to Supabase directly,
and `backend/` is only a tiny server that hosts the built site.

## 1. Create the Supabase project

1. Create a project at https://supabase.com/dashboard.
2. **Run the migrations, in order.** Open *SQL Editor*, then for each file below paste its whole
   contents into a new query and run it once:
   1. `supabase/migrations/20261014000000_planner_schema.sql` (habits, weekly notes)
   2. `supabase/migrations/20261016000000_goals.sql` (goals; needs the first one already applied)
   3. `supabase/migrations/20261017000000_diary.sql` (daily diary; needs the first one already applied)
   4. `supabase/migrations/20261020000000_day_tasks.sql` (the Daily plan: today's tasks and tomorrow's optional list)

   (With the CLI instead: `supabase link --project-ref <ref>` then `supabase db push`.)
3. **Check it worked.** *Table Editor* shows `weeks`, `week_tasks`, `goals`, `diary_entries` and `day_tasks`, all marked
   "RLS enabled", with 4 policies each (*Authentication → Policies*).

## 2. Auth settings (Authentication)

| Setting | Where | Value |
| --- | --- | --- |
| Site URL | URL Configuration | `http://localhost:5173` while developing, your real URL in production |
| Redirect URLs | URL Configuration | add `http://localhost:5173/**` (and `https://your-domain/**`) so confirmation and reset links are allowed to come back to the app |
| Email provider | Providers → Email | enabled |
| Confirm email | Providers → Email | on is recommended. The app handles both on and off |
| Minimum password length | Providers → Email | 8 (the app also requires 8) |
| Email delivery | SMTP Settings | the built-in sender is heavily rate-limited, so set up your own SMTP before real users sign up |

## 3. Environment variables

`frontend/.env` (copy from `frontend/.env.example`; it is git-ignored):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

Both are in *Project Settings → API*. **Only the public anon/publishable key goes here.**
Never put the `service_role` key in the frontend or in any `VITE_` variable. It bypasses
RLS entirely. Restart `npm run dev` after editing `.env`.

For production, set the same two variables in your host's build environment
(Vite reads them at build time).

## 4. Run it

```
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Without the two variables the app shows a "needs a Supabase project" page instead of
crashing.

## 5. Deploy (optional)

Build the site and serve it with the bundled server:

```
npm run build        # from the repo root: installs and builds the frontend
npm start            # serves frontend/dist (reads PORT, default 5003)
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's **build** environment,
because Vite bakes them in at build time. Any static host (Netlify, Vercel, Cloudflare Pages)
also works with just `frontend/`: build command `npm run build`, output folder `dist`,
and a rewrite of all paths to `/index.html`.

## 6. Writing assistant (optional)

The diary works fully without this. The **Improve my writing** panel (correct, make more natural,
explain mistakes, vocabulary) needs an AI service, and an AI key must never be put in the website's
code. So it runs as a Supabase **Edge Function** that holds the key as a secret. Until you set it up,
the panel's buttons answer "The writing assistant hasn't been set up on your Supabase project yet".
Nothing is sent anywhere until a signed-in person ticks the agreement box and presses a tool button.

You need an Anthropic API key (https://console.anthropic.com). **Set a monthly spend limit there**: the
function accepts only signed-in users and 6,000 characters per request, but it has no per-user quota.

**With the Supabase dashboard (no command line):**
1. *Edge Functions* -> *Deploy a new function* -> *Via editor*. Name it exactly `writing-assist`.
2. Replace the starter code with the contents of `supabase/functions/writing-assist/index.ts`, and add a
   second file named `logic.ts` with the contents of `supabase/functions/writing-assist/logic.ts`. Deploy.
3. *Edge Functions* -> *Secrets* -> add `ANTHROPIC_API_KEY` = your key.
   Optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).
4. Leave "Verify JWT" switched on (the function also checks the caller is a real signed-in user).

**Or with the Supabase CLI:**
```
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy writing-assist
```

No new variables are needed in `frontend/.env`: the website reaches the function through the same
public URL and key it already uses. Check it worked: open a diary entry, tick the agreement box,
write a few lines, press **Correct my writing**.

## 7. Test checklist

0. Diary: **Diary** in the top bar -> *Write today's diary*. Write, *Save draft*, then *Save entry*.
   Refresh: it is still there. Open the Planner: today shows a diary dot in the month calendar and a
   chip in the week's **Diary** row. Try typing, then clicking another page: you are asked first.

1. Visit `/` signed out: you land on `/login`.
2. Register user A, add habits, tick days, write notes. Refresh: everything is still there.
3. Sign out (account menu). You're back on `/login`, and `/` redirects there.
4. Register user B (use another email): the planner is empty. Add different habits.
5. Sign in as A again: only A's habits. Open a private window, sign in as A: same data.
6. Edit on device 1, return to device 2: the change appears when the tab regains focus.
7. Forgot password: request a link, open it, set a new password, sign in with it.
8. Authorisation: in the browser console while signed in as B, run
   `await supabase.from("weeks").select()` against A's ids, or
   `supabase.from("week_tasks").update({text:"x"}).eq("id", "<A's task id>")`.
   Both return nothing and change nothing (RLS), and inserting a row with A's `user_id` fails.
   (To try this in the console, temporarily add `window.supabase = supabase` in `src/lib/supabase.js`.)

## Notes

- The Planner's **Daily plan** holds small tasks for a specific date. What you add under Tomorrow is
  optional, and becomes today's list at midnight on its own (tasks belong to dates). A day holds up to 30
  tasks. It is separate from the weekly habit grid.

- The diary keeps one entry per date. Writing on a date that already has one edits it. If another
  device saved that date first (or changed the entry meanwhile), you are asked whether to keep your
  version or load theirs; nothing is overwritten silently.
- Diary text is private to your account (Row Level Security). It leaves the database only to show you
  your own entries, and goes to the AI only when you press a writing tool.
- Writing progress counts words and days written. It does not grade your English.

- Saves are per changed row (one habit, one checkbox, the notes), so two devices editing
  different habits don't overwrite each other. Two devices editing the *same* field is last
  write wins.
- Realtime isn't used. The planner re-checks the database when a tab regains focus (and only
  if it has no unsaved edits). Live push between devices would be a small add-on if you
  need it.
- Sign out ends this device's session only, other devices stay signed in.
