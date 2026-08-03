-- Rich-text learner competencies included in each lesson plan.

alter table public.lesson_plans
  add column if not exists learner_competencies text;

comment on column public.lesson_plans.learner_competencies is
  'Rich-text summary of the learner competencies developed by this lesson plan';
