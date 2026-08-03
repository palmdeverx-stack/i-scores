-- Track which lesson-plan steps have been explicitly saved by the teacher.

alter table public.lesson_plans
  add column if not exists saved_tabs text[] not null default '{}';

comment on column public.lesson_plans.saved_tabs is
  'Form tab identifiers explicitly saved by the teacher; used for per-step completion state.';
