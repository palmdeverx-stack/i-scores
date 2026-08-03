-- Rich-text essential or guiding questions for each lesson plan.

alter table public.lesson_plans
  add column if not exists guiding_questions text;

comment on column public.lesson_plans.guiding_questions is
  'Rich-text list of essential questions (Big Questions) for the lesson plan';
