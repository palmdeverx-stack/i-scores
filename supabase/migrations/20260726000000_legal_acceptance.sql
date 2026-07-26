-- Every account must accept the terms of service and privacy policy before
-- using the app. Nullable: existing accounts are prompted once on next
-- login, new accounts must accept before reaching their dashboard.
alter table public.app_users
  add column accepted_legal_at timestamptz;
