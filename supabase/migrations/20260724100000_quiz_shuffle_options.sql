-- Allow teachers to shuffle answer options independently from questions.

alter table public.quiz_settings
  add column shuffle_options boolean not null default false;
