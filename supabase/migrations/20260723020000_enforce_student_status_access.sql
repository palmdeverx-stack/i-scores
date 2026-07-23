-- Student standing controls both account access and eligibility for enrollment.
-- Any status other than "studying" is terminal until an administrator changes
-- the student back to "studying".

update public.app_users
set is_active = false
where role = 'student'
  and student_status in ('graduated', 'transferred', 'withdrawn', 'dismissed');

create or replace function public.sync_student_status_access()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'student'
     and coalesce(new.student_status, 'studying') <> 'studying' then
    new.is_active := false;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_student_status_access_on_users on public.app_users;
create trigger sync_student_status_access_on_users
  before insert or update of student_status, is_active on public.app_users
  for each row execute function public.sync_student_status_access();

create or replace function public.check_student_can_enroll()
returns trigger
language plpgsql
as $$
declare
  eligible boolean;
begin
  select (
    role = 'student'
    and is_active = true
    and coalesce(student_status, 'studying') = 'studying'
  )
  into eligible
  from public.app_users
  where id = new.student_id;

  if coalesce(eligible, false) = false then
    raise exception 'Student account is not eligible for enrollment'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists check_student_can_enroll_on_enrollments on public.enrollments;
create trigger check_student_can_enroll_on_enrollments
  before insert or update of student_id on public.enrollments
  for each row execute function public.check_student_can_enroll();
