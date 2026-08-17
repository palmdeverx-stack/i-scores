alter table public.schools
  add column if not exists attendance_require_daily_qr boolean not null default false;

create table if not exists public.staff_work_attendance_daily_qr (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  work_date date not null,
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint staff_work_attendance_daily_qr_school_date_unique unique (school_id, work_date),
  constraint staff_work_attendance_daily_qr_token_unique unique (token)
);

alter table public.staff_work_attendance_daily_qr enable row level security;
