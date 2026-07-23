-- Extended student identity and demographic profile fields.

alter table public.app_users
  add column if not exists student_code text,
  add column if not exists national_id text,
  add column if not exists name_prefix text,
  add column if not exists first_name_en text,
  add column if not exists last_name_en text,
  add column if not exists nickname text,
  add column if not exists gender text,
  add column if not exists birth_date date,
  add column if not exists nationality text,
  add column if not exists ethnicity text,
  add column if not exists religion text;

create unique index if not exists app_users_school_student_code_key
  on public.app_users (school_id, lower(student_code))
  where role = 'student' and student_code is not null;

create unique index if not exists app_users_national_id_key
  on public.app_users (national_id)
  where role = 'student' and national_id is not null;

alter table public.app_users
  add constraint app_users_student_gender_check
  check (gender is null or gender in ('male', 'female', 'other', 'unspecified'));
