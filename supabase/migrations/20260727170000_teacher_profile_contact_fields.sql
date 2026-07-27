-- Contact information teachers may maintain on their own profile.

alter table public.app_users
  add column if not exists phone text,
  add column if not exists address text;

