# Setup: accounts + cloud database (Supabase)

The planner signs people in with Supabase Auth and stores every user's weeks in a
Supabase Postgres database. Row Level Security makes each account's rows
reachable only by that account. MongoDB is gone. The browser talks to Supabase directly,
and `backend/` is only a tiny server that hosts the built site.

## 1. Create the Supabase project

1. Create a project at https://supabase.com/dashboard.
2. **Run the migration.** Open *SQL Editor*, paste the whole file
   `supabase/migrations/20261014000000_planner_schema.sql` and run it once.
   (With the CLI instead: `supabase link --project-ref <ref>` then `supabase db push`.)
3. **Check it worked.** *Table Editor* shows `weeks` and `week_tasks`, both marked
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

## 6. Test checklist

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

- Saves are per changed row (one habit, one checkbox, the notes), so two devices editing
  different habits don't overwrite each other. Two devices editing the *same* field is last
  write wins.
- Realtime isn't used. The planner re-checks the database when a tab regains focus (and only
  if it has no unsaved edits). Live push between devices would be a small add-on if you
  need it.
- Sign out ends this device's session only, other devices stay signed in.
