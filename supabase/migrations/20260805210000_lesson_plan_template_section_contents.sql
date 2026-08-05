-- Persist the shared Template editor model on real lesson plans. Legacy text
-- columns remain populated for PDF/review compatibility and old records are
-- hydrated into this structure by the application.

alter table public.lesson_plans
  add column if not exists template_section_contents jsonb not null default '{}'::jsonb;

comment on column public.lesson_plans.template_section_contents is
  'Structured content used by the shared lesson-plan and Template editors';

notify pgrst, 'reload schema';
