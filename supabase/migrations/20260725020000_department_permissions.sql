-- Generalizes the one-off `can_manage_timetable` flag into a reusable
-- department-permission catalog: a department must be granted a permission
-- key before any of its members can be individually delegated that key.
-- (Today the only real key is 'schedule.manage'; more admin-page permissions
-- can be added later without another migration.)

create table public.department_permissions (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (department_id, permission_key)
);

create table public.department_member_permissions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.department_members (id) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (member_id, permission_key)
);

alter table public.department_permissions enable row level security;
alter table public.department_member_permissions enable row level security;

insert into public.department_permissions (department_id, permission_key)
select id, 'schedule.manage' from public.departments where can_manage_timetable = true;

insert into public.department_member_permissions (member_id, permission_key)
select id, 'schedule.manage' from public.department_members where can_manage_timetable = true;

alter table public.departments drop column can_manage_timetable;
alter table public.department_members drop column can_manage_timetable;
