-- Keep `name` as the Thai/default school name for backwards compatibility.
alter table public.schools
  add column if not exists name_en text;
