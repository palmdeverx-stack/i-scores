-- One revocable QR per student. The QR contains only an opaque token and
-- carries no student PII. A teacher chooses the attendance context before
-- scanning, so the same QR works for homeroom morning/evening and classes.

create table if not exists public.student_qr_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  is_active boolean not null default true,
  issued_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_qr_codes_student_unique unique (student_id),
  constraint student_qr_codes_token_unique unique (token)
);

create index if not exists student_qr_codes_school_idx
  on public.student_qr_codes (school_id, student_id);

drop trigger if exists set_student_qr_codes_updated_at on public.student_qr_codes;
create trigger set_student_qr_codes_updated_at
  before update on public.student_qr_codes
  for each row execute function public.handle_updated_at ();

alter table public.student_qr_codes enable row level security;

create table if not exists public.attendance_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid not null references public.app_users (id) on delete cascade,
  session_type text not null
    check (session_type in ('homeroom_morning', 'class_period', 'homeroom_evening')),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  teacher_assignment_id uuid references public.teacher_assignments (id) on delete cascade,
  period_label text,
  session_date date not null,
  opened_at timestamptz not null default now(),
  late_after timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  constraint attendance_scan_sessions_time_check
    check (closes_at > opened_at and late_after >= opened_at and late_after <= closes_at),
  constraint attendance_scan_sessions_context_check check (
    (session_type = 'class_period' and teacher_assignment_id is not null)
    or
    (session_type in ('homeroom_morning', 'homeroom_evening') and teacher_assignment_id is null)
  )
);

create index if not exists attendance_scan_sessions_teacher_idx
  on public.attendance_scan_sessions (teacher_id, session_date, status);
create index if not exists attendance_scan_sessions_classroom_idx
  on public.attendance_scan_sessions (classroom_id, session_date);

alter table public.attendance_scan_sessions enable row level security;

create table if not exists public.attendance_scan_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_scan_sessions (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  status text not null check (status in ('present', 'late')),
  scanned_at timestamptz not null default now(),
  recorded_by uuid references public.app_users (id) on delete set null,
  constraint attendance_scan_events_unique unique (session_id, student_id)
);

create index if not exists attendance_scan_events_session_idx
  on public.attendance_scan_events (session_id, scanned_at desc);

alter table public.attendance_scan_events enable row level security;

-- Existing subject attendance was one record per subject/day. period_key keeps
-- that manual daily sheet compatible while allowing multiple QR periods per day.
alter table public.attendance
  add column if not exists period_key text not null default 'daily';

alter table public.attendance
  drop constraint if exists attendance_unique_session;

alter table public.attendance
  drop constraint if exists attendance_unique_period;

alter table public.attendance
  add constraint attendance_unique_period
  unique (teacher_assignment_id, student_id, session_date, period_key);
