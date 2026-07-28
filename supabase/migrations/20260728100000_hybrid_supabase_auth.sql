-- Hybrid authentication:
-- - staff credentials live in Supabase Auth
-- - student credentials continue to live in public.app_users
-- app_users remains the application profile/authorization record for every role,
-- because the rest of the school data model references its id.

alter table public.app_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists auth_login_email text,
  add column if not exists auth_role text,
  add column if not exists auth_migrated_at timestamptz;

alter table public.app_users
  drop constraint if exists app_users_auth_role_check;

alter table public.app_users
  add constraint app_users_auth_role_check
  check (
    auth_role is null
    or auth_role in ('super_admin', 'school_admin', 'academic_admin', 'teacher')
  );

create unique index if not exists app_users_auth_user_id_key
  on public.app_users (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists app_users_auth_login_email_key
  on public.app_users (lower(auth_login_email))
  where auth_login_email is not null;

update public.app_users
set auth_role = case role
  when 'master_admin' then 'super_admin'
  when 'school_admin' then 'school_admin'
  when 'teacher' then 'teacher'
  else null
end
where auth_role is null;

comment on column public.app_users.auth_user_id is
  'Links a staff application profile to the shared Supabase Auth identity.';
comment on column public.app_users.auth_login_email is
  'Email identifier used internally by Supabase Auth; the user may still sign in with username.';
comment on column public.app_users.auth_role is
  'Shared cross-application role stored in auth.users app_metadata.role.';
comment on column public.app_users.auth_migrated_at is
  'When this legacy staff account was linked to Supabase Auth.';
