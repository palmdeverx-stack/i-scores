-- Custom application users table, independent from Supabase Auth (auth.users).
-- All access goes through server-side API routes using the service role key;
-- RLS is enabled with no policies so anon/authenticated PostgREST roles get nothing.

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  email text,
  first_name text,
  last_name text,
  role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index app_users_username_key on public.app_users (lower(username));

alter table public.app_users enable row level security;

create trigger set_app_users_updated_at
  before update on public.app_users
  for each row execute function public.handle_updated_at ();
