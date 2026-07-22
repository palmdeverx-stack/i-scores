-- Daily class attendance: one row per student per teacher_assignment per
-- session date, recording whether the student was present, absent, on
-- leave, or late. A teacher_assignment is a subject+classroom+semester, so
-- this ties attendance to the same "who teaches what, where" scope used by
-- assignments/scores.
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  teacher_assignment_id uuid not null references public.teacher_assignments (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  session_date date not null,
  status text not null check (status in ('present', 'absent', 'leave', 'late')),
  note text,
  recorded_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_unique_session unique (teacher_assignment_id, student_id, session_date)
);

create index attendance_teacher_assignment_session_idx
  on public.attendance (teacher_assignment_id, session_date);

create index attendance_student_id_idx
  on public.attendance (student_id);

create trigger set_attendance_updated_at
  before update on public.attendance
  for each row execute function public.handle_updated_at ();

alter table public.attendance enable row level security;
