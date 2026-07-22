-- Teacher/student accounts get an auto-generated password and must set
-- their own on first login.
alter table public.app_users
  add column must_change_password boolean not null default false;
