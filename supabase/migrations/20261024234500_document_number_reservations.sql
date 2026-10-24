alter table public.school_user_documents drop constraint school_user_documents_status_check;
alter table public.school_user_documents add constraint school_user_documents_status_check
  check(status in ('reserved','draft','submitted','ready','cancelled'));
alter table public.school_user_documents add column planned_date date, add column reserved_at timestamptz;
-- Number allocation still uses school_documents_assign_number. It runs only on
-- INSERT, so filling a reservation later never consumes another document number.
