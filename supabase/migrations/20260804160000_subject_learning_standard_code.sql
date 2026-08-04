-- Keep the curriculum standard code separate from its rich-text description.

alter table public.subjects
  add column if not exists learning_standard_code text
  check (learning_standard_code is null or char_length(learning_standard_code) <= 100);

comment on column public.subjects.learning_standard_code is
  'Stable curriculum standard code; learning_standards stores the rich-text description.';
