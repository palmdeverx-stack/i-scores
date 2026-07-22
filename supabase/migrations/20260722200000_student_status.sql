-- Enrollment standing for student accounts: studying, graduated, transferred
-- out, withdrawn, or dismissed. Only meaningful for role = 'student'; left
-- null for staff/admin accounts.

alter table public.app_users
  add column if not exists student_status text
  check (student_status in ('studying', 'graduated', 'transferred', 'withdrawn', 'dismissed'));

update public.app_users
  set student_status = 'studying'
  where role = 'student' and student_status is null;
