-- Let admins turn the in-app and LINE legs of the grade-submission reminder
-- on/off independently per semester, instead of always sending both.
alter table public.semesters
  add column if not exists grade_reminder_notify_in_app boolean not null default true,
  add column if not exists grade_reminder_notify_line boolean not null default true;

comment on column public.semesters.grade_reminder_notify_in_app is
  'Whether the daily grade-submission reminder sends an in-app notification';
comment on column public.semesters.grade_reminder_notify_line is
  'Whether the daily grade-submission reminder sends a LINE push (still requires the teacher to have linked LINE)';
