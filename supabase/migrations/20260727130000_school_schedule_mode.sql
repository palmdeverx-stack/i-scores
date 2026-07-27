-- One school-wide switch controls period-based or free-hour scheduling.

alter table public.schools
  add column if not exists schedule_mode text not null default 'hour';

alter table public.schools
  drop constraint if exists schools_schedule_mode_check;

alter table public.schools
  add constraint schools_schedule_mode_check
  check (schedule_mode in ('hour', 'period'));
