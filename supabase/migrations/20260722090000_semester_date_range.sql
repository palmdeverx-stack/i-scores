-- Ensure each semester has a valid date range when dates are provided.

alter table public.semesters
  add constraint semesters_date_range_check
  check (start_date is null or end_date is null or end_date >= start_date);
