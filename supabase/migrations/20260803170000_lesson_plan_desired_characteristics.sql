-- Rich-text desired learner characteristics included in each lesson plan.

alter table public.lesson_plans
  add column if not exists desired_characteristics text;

comment on column public.lesson_plans.desired_characteristics is
  'Rich-text desired characteristics cultivated by the lesson plan';
