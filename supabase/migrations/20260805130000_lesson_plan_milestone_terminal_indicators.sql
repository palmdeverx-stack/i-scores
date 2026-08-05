-- Split the free-text lesson plan indicators into milestone (ระหว่างทาง) and
-- terminal (ปลายทาง) indicator lists. The legacy `indicators` column is kept
-- for history/backward compatibility.

alter table public.lesson_plans
  add column if not exists milestone_indicators text,
  add column if not exists terminal_indicators text;

comment on column public.lesson_plans.milestone_indicators is
  'Serialized milestone (ระหว่างทาง) indicators, one per line as "code description"';
comment on column public.lesson_plans.terminal_indicators is
  'Serialized terminal (ปลายทาง) indicators, one per line as "code description"';
