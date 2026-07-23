-- Account activation controls for login access.

alter table public.app_users
  add column if not exists is_active boolean not null default true;

create index if not exists app_users_school_active_idx
  on public.app_users (school_id, is_active);
