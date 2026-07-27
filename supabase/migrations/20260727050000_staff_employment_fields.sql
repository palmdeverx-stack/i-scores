-- Employment details for teacher/staff accounts.

alter table public.app_users
  add column if not exists staff_type text,
  add column if not exists employment_status text,
  add column if not exists employment_start_date date,
  add column if not exists appointment_date date,
  add column if not exists contract_end_date date,
  add column if not exists position_title text,
  add column if not exists academic_rank text;

update public.app_users
set
  staff_type = coalesce(staff_type, 'teacher'),
  employment_status = coalesce(employment_status, 'active')
where role = 'teacher';

alter table public.app_users
  add constraint app_users_teacher_employment_required_check
  check (role <> 'teacher' or (staff_type is not null and employment_status is not null)),
  add constraint app_users_staff_type_check
  check (
    staff_type is null
    or staff_type in (
      'executive',
      'teacher',
      'contract_teacher',
      'government_employee',
      'administrative_officer',
      'janitor'
    )
  ),
  add constraint app_users_employment_status_check
  check (
    employment_status is null
    or employment_status in ('active', 'study_leave', 'leave', 'retired', 'terminated')
  ),
  add constraint app_users_contract_dates_check
  check (
    contract_end_date is null
    or employment_start_date is null
    or contract_end_date >= employment_start_date
  );
