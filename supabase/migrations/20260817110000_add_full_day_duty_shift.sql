alter table public.school_duty_schedules
  drop constraint if exists school_duty_schedules_shift_check;

alter table public.school_duty_schedules
  add constraint school_duty_schedules_shift_check
  check (shift in ('morning', 'evening', 'full_day'));

update public.school_duty_schedules
set shift = 'full_day'
where starts_at < time '12:00'
  and ends_at > time '12:00';
