-- Weekly recurring time slots for a teacher_assignment (subject + classroom +
-- semester), so a teacher's timetable can be shown. One assignment can meet
-- multiple times a week (e.g. Monday 08:00-09:00 and Wednesday 10:00-11:00).
create table public.teaching_schedules (
  id uuid primary key default gen_random_uuid(),
  teacher_assignment_id uuid not null references public.teacher_assignments (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7), -- 1 = Monday .. 7 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint teaching_schedules_time_range_check check (end_time > start_time)
);

create index teaching_schedules_teacher_assignment_id_idx
  on public.teaching_schedules (teacher_assignment_id);

alter table public.teaching_schedules enable row level security;
