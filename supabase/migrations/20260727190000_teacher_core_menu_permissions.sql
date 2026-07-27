-- Core /teacher menus are also controlled by staff-type permissions.

insert into public.staff_type_permissions (
  school_id,
  staff_type,
  permission_key,
  access_level
)
select school.id, preset.staff_type, preset.permission_key, preset.access_level
from public.schools school
cross join (
  values
    ('executive', 'dashboard.view', 'view'),
    ('teacher', 'dashboard.view', 'view'),
    ('teacher', 'teaching.assignments', 'manage'),
    ('teacher', 'teaching.students', 'view'),
    ('teacher', 'teaching.attendance', 'manage'),
    ('teacher', 'teaching.timetable', 'view'),
    ('teacher', 'teaching.announcements', 'manage'),
    ('contract_teacher', 'dashboard.view', 'view'),
    ('contract_teacher', 'teaching.assignments', 'manage'),
    ('contract_teacher', 'teaching.students', 'view'),
    ('contract_teacher', 'teaching.attendance', 'manage'),
    ('contract_teacher', 'teaching.timetable', 'view'),
    ('contract_teacher', 'teaching.announcements', 'manage'),
    ('government_employee', 'dashboard.view', 'view'),
    ('government_employee', 'teaching.assignments', 'manage'),
    ('government_employee', 'teaching.students', 'view'),
    ('government_employee', 'teaching.attendance', 'manage'),
    ('government_employee', 'teaching.timetable', 'view'),
    ('government_employee', 'teaching.announcements', 'manage'),
    ('administrative_officer', 'dashboard.view', 'view'),
    ('administrative_officer', 'teaching.announcements', 'view'),
    ('janitor', 'dashboard.view', 'view'),
    ('janitor', 'teaching.announcements', 'view')
) as preset(staff_type, permission_key, access_level)
on conflict (school_id, staff_type, permission_key) do nothing;

create or replace function public.seed_staff_type_permissions(target_school_id uuid)
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
  select target_school_id, preset.staff_type, preset.permission_key, preset.access_level
  from (
    values
      ('executive', 'dashboard.view', 'view'),
      ('executive', 'schedule.approve', 'manage'),
      ('executive', 'grades.approve', 'manage'),
      ('teacher', 'dashboard.view', 'view'),
      ('teacher', 'teaching.assignments', 'manage'),
      ('teacher', 'teaching.students', 'view'),
      ('teacher', 'teaching.attendance', 'manage'),
      ('teacher', 'teaching.timetable', 'view'),
      ('teacher', 'teaching.announcements', 'manage'),
      ('contract_teacher', 'dashboard.view', 'view'),
      ('contract_teacher', 'teaching.assignments', 'manage'),
      ('contract_teacher', 'teaching.students', 'view'),
      ('contract_teacher', 'teaching.attendance', 'manage'),
      ('contract_teacher', 'teaching.timetable', 'view'),
      ('contract_teacher', 'teaching.announcements', 'manage'),
      ('government_employee', 'dashboard.view', 'view'),
      ('government_employee', 'teaching.assignments', 'manage'),
      ('government_employee', 'teaching.students', 'view'),
      ('government_employee', 'teaching.attendance', 'manage'),
      ('government_employee', 'teaching.timetable', 'view'),
      ('government_employee', 'teaching.announcements', 'manage'),
      ('administrative_officer', 'dashboard.view', 'view'),
      ('administrative_officer', 'teaching.announcements', 'view'),
      ('janitor', 'dashboard.view', 'view'),
      ('janitor', 'teaching.announcements', 'view')
  ) as preset(staff_type, permission_key, access_level)
  on conflict (school_id, staff_type, permission_key) do nothing;
$$;

