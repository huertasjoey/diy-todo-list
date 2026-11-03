-- Habit renewals: a habit lasts one month. In the next month the planner asks whether to keep
-- it going, and the answer is stored here. Until there is an answer the habit is paused (it is
-- not carried into that month's weeks). A habit's month is the month its week's Monday falls in.
-- Run after 20261014000000_planner_schema.sql (it reuses public.touch_updated_at()).

create table public.habit_renewals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  -- the first day of the month the answer is for
  month_start  date not null,
  -- the habit, as written in the planner (trimmed)
  text         text not null check (char_length(btrim(text)) between 1 and 300),
  -- true = keep it going this month, false = it has ended
  continued    boolean not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint habit_renewals_first_of_month check (extract(day from month_start) = 1),
  -- one answer per habit per month; answering again replaces it
  constraint habit_renewals_unique unique (user_id, month_start, text)
);

create trigger habit_renewals_touch before update on public.habit_renewals
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- security

alter table public.habit_renewals enable row level security;
alter table public.habit_renewals force row level security;

revoke all on public.habit_renewals from anon;
grant select, insert, update, delete on public.habit_renewals to authenticated;

create policy "habit_renewals: read own" on public.habit_renewals
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "habit_renewals: insert own" on public.habit_renewals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "habit_renewals: update own" on public.habit_renewals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "habit_renewals: delete own" on public.habit_renewals
  for delete to authenticated
  using ((select auth.uid()) = user_id);
