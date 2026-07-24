-- Allow each quiz question to use either single-select or multiple-select answers.

alter table public.quiz_questions
  add column selection_mode text not null default 'single'
  check (selection_mode in ('single', 'multiple'));

drop index if exists public.quiz_options_one_correct_per_question;

alter table public.quiz_answers
  drop constraint if exists quiz_answers_attempt_id_question_id_key;

alter table public.quiz_answers
  add constraint quiz_answers_attempt_question_option_key
  unique (attempt_id, question_id, selected_option_id);
