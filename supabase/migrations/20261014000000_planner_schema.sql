-- Weekly planner: per-user weeks and tasks, protected by Row Level Security.
-- Passwords are never stored here: accounts live in Supabase Auth (auth.users).

-- ---------------------------------------------------------------- tables

create table public.weeks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  -- the Monday that starts the week
  week_start  date not null,
  notes       text not null default '' check (char_length(notes) <= 20000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint weeks_start_is_monday check (extract(isodow from week_start) = 1),
  -- one record per user per week; also what makes imports idempotent
  constraint weeks_user_week_unique unique (user_id, week_start),
  -- lets week_tasks prove that a task and its week have the same owner
  constraint weeks_id_user_unique unique (id, user_id)
);

create table public.week_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  week_id     uuid not null,
  -- fractional ordering: inserting a row between two others only touches that row
  position    double precision not null,
  text        text not null default '' check (char_length(text) <= 300),
  -- Monday ... Sunday
  days        boolean[] not null default '{f,f,f,f,f,f,f}'
                check (array_length(days, 1) = 7),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- a task can only hang off a week owned by the same user, whatever the client sends
  constraint week_tasks_week_owner_fk
    foreign key (week_id, user_id)
    references public.weeks (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------- indexes

-- weeks(user_id, week_start) is already indexed by the unique constraint.
create index week_tasks_week_idx on public.week_tasks (week_id, position);
create index week_tasks_user_idx on public.week_tasks (user_id);

-- ---------------------------------------------------------------- timestamps

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger weeks_touch before update on public.weeks
  for each row execute function public.touch_updated_at();
create trigger week_tasks_touch before update on public.week_tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- security

alter table public.weeks      enable row level security;
alter table public.week_tasks enable row level security;
-- apply the policies to the table owner as well
alter table public.weeks      force row level security;
alter table public.week_tasks force row level security;

-- Signed-out visitors (the anon role) get no access at all.
revoke all on public.weeks      from anon;
revoke all on public.week_tasks from anon;
grant select, insert, update, delete on public.weeks      to authenticated;
grant select, insert, update, delete on public.week_tasks to authenticated;

-- (select auth.uid()) is evaluated once per statement, not once per row.
create policy "weeks: read own" on public.weeks
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "weeks: insert own" on public.weeks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "weeks: update own" on public.weeks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "weeks: delete own" on public.weeks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "week_tasks: read own" on public.week_tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "week_tasks: insert own" on public.week_tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "week_tasks: update own" on public.week_tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "week_tasks: delete own" on public.week_tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
