alter table public.schools
  add column if not exists attendance_qr_rotation_minutes integer not null default 5;

alter table public.schools
  drop constraint if exists schools_attendance_qr_rotation_check;
alter table public.schools
  add constraint schools_attendance_qr_rotation_check
  check (attendance_qr_rotation_minutes between 1 and 60);

alter table public.staff_work_attendance_daily_qr
  add column if not exists rotation_slot bigint not null default 0;
