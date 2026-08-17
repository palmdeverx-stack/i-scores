create table if not exists public.student_school_gate_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  attendance_date date not null,
  entered_at timestamptz,
  entered_by uuid references public.app_users (id) on delete set null,
  entry_duty_schedule_id uuid references public.school_duty_schedules (id) on delete set null,
  exited_at timestamptz,
  exited_by uuid references public.app_users (id) on delete set null,
  exit_duty_schedule_id uuid references public.school_duty_schedules (id) on delete set null,
  is_late boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_school_gate_attendance_daily_unique
    unique (school_id, student_id, attendance_date),
  constraint student_school_gate_attendance_event_check check (
    entered_at is not null or exited_at is not null
  ),
  constraint student_school_gate_attendance_order_check check (
    exited_at is null or entered_at is null or exited_at >= entered_at
  )
);

create index if not exists student_school_gate_attendance_school_date_idx
  on public.student_school_gate_attendance (school_id, attendance_date, entered_at desc);

drop trigger if exists set_student_school_gate_attendance_updated_at
  on public.student_school_gate_attendance;
create trigger set_student_school_gate_attendance_updated_at
  before update on public.student_school_gate_attendance
  for each row execute function public.handle_updated_at ();

alter table public.student_school_gate_attendance enable row level security;
