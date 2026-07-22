-- A student can only belong to one classroom per academic year (they can still
-- take many subjects, each with its own teacher, via teacher_assignments on
-- that classroom). Denormalize academic_year_id onto enrollments so we can
-- enforce this with a unique constraint.

alter table public.enrollments
  add column academic_year_id uuid;

update public.enrollments e
set academic_year_id = c.academic_year_id
from public.classrooms c
where c.id = e.classroom_id;

alter table public.enrollments
  alter column academic_year_id set not null,
  add constraint enrollments_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id) on delete cascade;

create or replace function public.set_enrollment_academic_year()
returns trigger
language plpgsql
as $$
begin
  select academic_year_id into new.academic_year_id
  from public.classrooms
  where id = new.classroom_id;

  return new;
end;
$$;

create trigger set_enrollments_academic_year
  before insert or update of classroom_id on public.enrollments
  for each row execute function public.set_enrollment_academic_year();

alter table public.enrollments
  add constraint enrollments_student_academic_year_key
  unique (student_id, academic_year_id);
