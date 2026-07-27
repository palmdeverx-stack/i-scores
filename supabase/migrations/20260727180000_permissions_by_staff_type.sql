-- Replace the executive-only preset with configurable permissions for every
-- teacher-role staff type. Role is checked first; staff_type decides the
-- additional school-wide pages/actions available inside /teacher.

alter table public.staff_type_permissions
  drop constraint if exists staff_type_permissions_staff_type_check;

alter table public.staff_type_permissions
  add constraint staff_type_permissions_staff_type_check
  check (
    staff_type in (
      'executive',
      'teacher',
      'contract_teacher',
      'government_employee',
      'administrative_officer',
      'janitor'
    )
  );

-- Preserve the expected approval capability for existing executives as an
-- editable starting preset. Schools may change it from the permissions page.
insert into public.staff_type_permissions (
  school_id,
  staff_type,
  permission_key,
  access_level
)
select school.id, 'executive', preset.permission_key, preset.access_level
from public.schools school
cross join (
  values
    ('dashboard.view', 'view'),
    ('schedule.approve', 'manage'),
    ('grades.approve', 'manage')
) as preset(permission_key, access_level)
on conflict (school_id, staff_type, permission_key) do update
set access_level = excluded.access_level;

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
  values
    (target_school_id, 'executive', 'dashboard.view', 'view'),
    (target_school_id, 'executive', 'schedule.approve', 'manage'),
    (target_school_id, 'executive', 'grades.approve', 'manage')
  on conflict (school_id, staff_type, permission_key) do nothing;
$$;

drop trigger if exists seed_executive_permissions_after_school_insert
  on public.schools;
drop function if exists public.seed_executive_permissions_after_school_insert();
drop function if exists public.seed_executive_permissions(uuid);

create or replace function public.seed_staff_type_permissions_after_school_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_staff_type_permissions(new.id);
  return new;
end;
$$;

create trigger seed_staff_type_permissions_after_school_insert
  after insert on public.schools
  for each row execute function public.seed_staff_type_permissions_after_school_insert();

revoke all on function public.seed_staff_type_permissions(uuid) from public;
revoke all on function public.seed_staff_type_permissions_after_school_insert() from public;
