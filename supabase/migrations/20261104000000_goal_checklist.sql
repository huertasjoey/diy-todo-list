-- Goal checklist: the steps toward a goal (for example, what to learn to become an AI engineer).
-- Stored on the goal itself as a list of { "id", "text", "done" }, in order.
-- Run after 20261016000000_goals.sql.

alter table public.goals
  add column checklist jsonb not null default '[]'::jsonb
    constraint goals_checklist_is_list check (
      jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 100
    );
