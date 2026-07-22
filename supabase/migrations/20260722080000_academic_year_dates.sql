-- Add the official date range for each academic year.

alter table public.academic_years
  add column start_date date,
  add column end_date date;

alter table public.academic_years
  add constraint academic_years_date_range_check
  check (start_date is null or end_date is null or end_date >= start_date);
