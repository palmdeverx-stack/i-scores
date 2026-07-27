-- Optional room, building, or other teaching location for each schedule slot.

alter table public.teaching_schedules
  add column if not exists location_name text;

alter table public.teaching_schedules
  drop constraint if exists teaching_schedules_location_name_length_check;

alter table public.teaching_schedules
  add constraint teaching_schedules_location_name_length_check
  check (location_name is null or char_length(location_name) <= 200);
