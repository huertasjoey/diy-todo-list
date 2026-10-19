-- Daily plan: small tasks for a specific day (today's list and the optional list for tomorrow).
-- Run after 20261014000000_planner_schema.sql (it reuses public.touch_updated_at()).

create table public.day_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  -- the day this task is planned for, in the person's own calendar
  task_date   date not null,
  text        text not null
                check (char_length(btrim(text)) between 1 and 200),
  done        boolean not null default false,
  -- order within the day (fractional, so adding or moving one task never rewrites the others)
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- "my tasks for these days, in order"
create index day_tasks_user_date_idx on public.day_tasks (user_id, task_date, position);

create trigger day_tasks_touch before update on public.day_tasks
  for each row execute function public.touch_updated_at();

-- A day can hold at most 30 tasks. Enforced here so no client can get around it.
create function public.limit_day_tasks() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.day_tasks
        where user_id = new.user_id and task_date = new.task_date) >= 30 then
    raise exception 'A day can have at most 30 tasks.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger day_tasks_limit before insert on public.day_tasks
  for each row execute function public.limit_day_tasks();

-- ---------------------------------------------------------------- security

alter table public.day_tasks enable row level security;
alter table public.day_tasks force row level security;

revoke all on public.day_tasks from anon;
grant select, insert, update, delete on public.day_tasks to authenticated;

create policy "day_tasks: read own" on public.day_tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "day_tasks: insert own" on public.day_tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "day_tasks: update own" on public.day_tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "day_tasks: delete own" on public.day_tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
