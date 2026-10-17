-- Goals: a title, a date range and measurable progress, private to each account.
-- Run after 20261014000000_planner_schema.sql (it reuses public.touch_updated_at()).

create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  title          text not null
                   check (char_length(btrim(title)) between 1 and 200),
  start_date     date not null,
  end_date       date not null,
  -- progress so far, never negative (it may exceed the target). Left blank it is 0.
  current_value  numeric(12, 2) not null default 0
                   check (current_value >= 0),
  -- optional: with no target the goal is just a titled date range (no progress bar or percentage)
  target_value   numeric(12, 2)
                   check (target_value is null or target_value > 0),
  -- optional label such as pages, km, hours or tasks
  unit           text not null default ''
                   check (char_length(unit) <= 30),
  -- a goal with a target completes by itself when current reaches it; this lets any goal
  -- (especially one with no target) be marked done by hand
  completed      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint goals_dates_ordered check (end_date >= start_date)
);

-- The calendar asks "which of my goals overlap this range?"
create index goals_user_dates_idx on public.goals (user_id, start_date, end_date);

-- The same goal can't be saved twice (a double click, a retried request, a re-import)
create unique index goals_no_duplicates_idx
  on public.goals (user_id, lower(btrim(title)), start_date, end_date);

create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- security

alter table public.goals enable row level security;
alter table public.goals force row level security;

revoke all on public.goals from anon;
grant select, insert, update, delete on public.goals to authenticated;

create policy "goals: read own" on public.goals
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "goals: insert own" on public.goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "goals: update own" on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "goals: delete own" on public.goals
  for delete to authenticated
  using ((select auth.uid()) = user_id);
