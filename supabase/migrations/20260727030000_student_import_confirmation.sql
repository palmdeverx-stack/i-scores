-- Students created through the Excel bulk-import start "pending confirmation"
-- so an admin can review imported data before treating them as ready to
-- enroll into a classroom. Manually-created students (the existing add-one
-- form) are confirmed immediately, so the default is now() rather than null
-- — existing rows get today's timestamp via the same ALTER, not null.
alter table public.app_users
  add column import_confirmed_at timestamptz default now();
