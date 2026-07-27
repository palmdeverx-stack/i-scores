-- School-wide permission presets by staff type, plus per-person overrides.

create table if not exists public.staff_type_permissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  staff_type text not null check (staff_type = 'executive'),
  permission_key text not null,
  access_level text not null check (access_level in ('view', 'manage')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, staff_type, permission_key)
);

create table if not exists public.staff_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references public.app_users (id) on delete cascade,
  permission_key text not null,
  access_level text not null check (access_level in ('none', 'view', 'manage')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

alter table public.staff_type_permissions enable row level security;
alter table public.staff_permission_overrides enable row level security;

drop trigger if exists set_staff_type_permissions_updated_at
  on public.staff_type_permissions;
create trigger set_staff_type_permissions_updated_at
  before update on public.staff_type_permissions
  for each row execute function public.handle_updated_at ();

drop trigger if exists set_staff_permission_overrides_updated_at
  on public.staff_permission_overrides;
create trigger set_staff_permission_overrides_updated_at
  before update on public.staff_permission_overrides
  for each row execute function public.handle_updated_at ();

create or replace function public.seed_executive_permissions(target_school_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.staff_type_permissions (
    school_id,
    staff_type,
    permission_key,
    access_level
  )
  values
    (target_school_id, 'executive', 'dashboard.view', 'view'),
    (target_school_id, 'executive', 'school_profile.view', 'view'),
    (target_school_id, 'executive', 'schedule.manage', 'view'),
    (target_school_id, 'executive', 'academic_years.manage', 'view'),
    (target_school_id, 'executive', 'classrooms.manage', 'view'),
    (target_school_id, 'executive', 'subjects.manage', 'view'),
    (target_school_id, 'executive', 'enrollments.manage', 'view'),
    (target_school_id, 'executive', 'announcements.manage', 'manage'),
    (target_school_id, 'executive', 'students.manage', 'view'),
    (target_school_id, 'executive', 'staff.manage', 'view')
  on conflict (school_id, staff_type, permission_key) do nothing;
$$;

select public.seed_executive_permissions(id) from public.schools;

create or replace function public.seed_executive_permissions_after_school_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_executive_permissions(new.id);
  return new;
end;
$$;

drop trigger if exists seed_executive_permissions_after_school_insert
  on public.schools;
create trigger seed_executive_permissions_after_school_insert
  after insert on public.schools
  for each row execute function public.seed_executive_permissions_after_school_insert();

revoke all on function public.seed_executive_permissions(uuid) from public;
revoke all on function public.seed_executive_permissions_after_school_insert() from public;
