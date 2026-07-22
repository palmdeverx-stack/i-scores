-- A classroom can have multiple homeroom teachers.
create table if not exists public.classroom_homeroom_teachers (
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  teacher_id uuid not null references public.app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (classroom_id, teacher_id)
);

alter table public.classroom_homeroom_teachers enable row level security;

-- Preserve useful data for existing classrooms by selecting the earliest
-- assigned teacher. Classrooms without an assignment must choose a teacher
-- the next time an administrator edits them.
insert into public.classroom_homeroom_teachers (classroom_id, teacher_id)
select distinct on (assignment.classroom_id)
  assignment.classroom_id,
  assignment.teacher_id
from public.teacher_assignments assignment
join public.app_users teacher on teacher.id = assignment.teacher_id
where teacher.role = 'teacher'
order by assignment.classroom_id, assignment.created_at
on conflict do nothing;
