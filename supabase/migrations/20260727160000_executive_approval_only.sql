-- Executives are governance users: overview + approval queues only.
-- Operational review/edit permissions belong to the responsible departments.

delete from public.staff_permission_overrides permission_override
using public.app_users staff
where permission_override.user_id = staff.id
  and staff.role = 'teacher'
  and staff.staff_type = 'executive';

delete from public.staff_type_permissions
where staff_type = 'executive';

insert into public.staff_type_permissions (
  school_id,
  staff_type,
  permission_key,
  access_level
)
select
  school.id,
  'executive',
  preset.permission_key,
  preset.access_level
from public.schools school
cross join (
  values
    ('dashboard.view', 'view'),
    ('grades.approve', 'manage')
) as preset(permission_key, access_level)
on conflict (school_id, staff_type, permission_key) do update
set access_level = excluded.access_level;

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
    (target_school_id, 'executive', 'grades.approve', 'manage')
  on conflict (school_id, staff_type, permission_key) do update
  set access_level = excluded.access_level;
$$;
