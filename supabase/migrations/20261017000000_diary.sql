-- Daily diary: one private entry per user per date.
-- Run after 20261014000000_planner_schema.sql (it reuses public.touch_updated_at()).

create table public.diary_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  -- the diary day, in the writer's local calendar (no time zone shifting)
  entry_date    date not null,
  title         text not null default ''
                  check (char_length(title) <= 200),
  -- the main journal text
  content       text not null default ''
                  check (char_length(content) <= 50000),
  mood          text
                  check (mood is null or mood in
                    ('happy', 'productive', 'grateful', 'calm', 'tired', 'sad', 'anxious', 'frustrated')),
  highlights    text not null default '' check (char_length(highlights) <= 5000),
  challenges    text not null default '' check (char_length(challenges) <= 5000),
  lessons       text not null default '' check (char_length(lessons) <= 5000),
  tomorrow      text not null default '' check (char_length(tomorrow) <= 5000),
  -- a draft can be saved half-written; a finished entry needs journal text
  is_draft      boolean not null default false,
  -- kept by the app so the history list and progress charts stay light
  word_count    integer not null default 0 check (word_count >= 0 and word_count < 1000000),
  preview       text not null default '' check (char_length(preview) <= 300),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint diary_content_required check (is_draft or btrim(content) <> ''),
  -- one entry per user per date: writing again on a date means editing that entry
  constraint diary_one_per_day unique (user_id, entry_date)
);

-- The unique constraint already indexes (user_id, entry_date), which serves
-- "newest first" and date-range queries. Searching text is limited to one user's rows.

create trigger diary_touch before update on public.diary_entries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- security

alter table public.diary_entries enable row level security;
alter table public.diary_entries force row level security;

revoke all on public.diary_entries from anon;
grant select, insert, update, delete on public.diary_entries to authenticated;

create policy "diary: read own" on public.diary_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "diary: insert own" on public.diary_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "diary: update own" on public.diary_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "diary: delete own" on public.diary_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);
