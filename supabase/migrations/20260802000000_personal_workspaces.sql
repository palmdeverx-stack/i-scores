-- Personal packages use an isolated tenant backed by the existing school-scoped
-- tables. The workspace is not presented as a school to the buyer, but retaining
-- a school_id internally keeps every feature tenant-safe without duplicating the
-- academic schema for individual accounts.

alter table public.schools
  add column if not exists workspace_type text not null default 'school';

alter table public.schools
  drop constraint if exists schools_workspace_type_check;

alter table public.schools
  add constraint schools_workspace_type_check
  check (workspace_type in ('school', 'personal'));

alter table public.schools
  add column if not exists owner_auth_user_id uuid references auth.users(id) on delete restrict;

create unique index if not exists schools_personal_owner_key
  on public.schools (owner_auth_user_id)
  where workspace_type = 'personal' and owner_auth_user_id is not null;

insert into public.ekru_apps (
  code,
  name,
  launch_path,
  required_feature_key,
  supported_scope,
  is_active
)
values (
  'PERSONAL_WORKSPACE',
  'E-KRU Personal Workspace',
  '/apps/personal-workspace',
  'admin.school_profile',
  'school',
  true
)
on conflict (code) do update
set
  name = excluded.name,
  launch_path = excluded.launch_path,
  required_feature_key = excluded.required_feature_key,
  supported_scope = excluded.supported_scope,
  is_active = excluded.is_active;

comment on column public.schools.workspace_type is
  'school is a normal organization tenant; personal is an isolated tenant created from an individual Marketplace package.';

comment on column public.schools.owner_auth_user_id is
  'Supabase Auth owner for a personal workspace. Null for normal school tenants.';
