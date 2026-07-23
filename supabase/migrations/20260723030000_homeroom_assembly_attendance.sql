-- Daily homeroom assembly attendance, recorded separately for morning and
-- evening so it does not mix with subject-period attendance.
create table if not exists public.homeroom_assembly_attendance (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  attendance_date date not null,
  period text not null check (period in ('morning', 'evening')),
  status text not null check (status in ('present', 'absent', 'leave', 'late')),
  note text,
  recorded_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homeroom_assembly_attendance_unique
    unique (classroom_id, student_id, attendance_date, period)
);

create index if not exists homeroom_assembly_attendance_classroom_date_idx
  on public.homeroom_assembly_attendance (classroom_id, attendance_date, period);

create index if not exists homeroom_assembly_attendance_student_idx
  on public.homeroom_assembly_attendance (student_id, attendance_date);

drop trigger if exists set_homeroom_assembly_attendance_updated_at
  on public.homeroom_assembly_attendance;
create trigger set_homeroom_assembly_attendance_updated_at
  before update on public.homeroom_assembly_attendance
  for each row execute function public.handle_updated_at ();

alter table public.homeroom_assembly_attendance enable row level security;
