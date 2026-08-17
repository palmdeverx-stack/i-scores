alter table public.schools
  add column if not exists attendance_latitude double precision,
  add column if not exists attendance_longitude double precision,
  add column if not exists attendance_radius_meters integer not null default 150;

alter table public.schools
  drop constraint if exists schools_attendance_coordinates_check;
alter table public.schools
  add constraint schools_attendance_coordinates_check check (
    (attendance_latitude is null and attendance_longitude is null)
    or
    (attendance_latitude between -90 and 90 and attendance_longitude between -180 and 180)
  );

alter table public.schools
  drop constraint if exists schools_attendance_radius_check;
alter table public.schools
  add constraint schools_attendance_radius_check
  check (attendance_radius_meters between 20 and 5000);

create table if not exists public.staff_work_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  staff_id uuid not null references public.app_users (id) on delete cascade,
  work_date date not null,
  checked_in_at timestamptz not null,
  checked_in_latitude double precision not null,
  checked_in_longitude double precision not null,
  checked_in_distance_meters integer not null,
  checked_out_at timestamptz,
  checked_out_latitude double precision,
  checked_out_longitude double precision,
  checked_out_distance_meters integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_work_attendance_daily_unique unique (staff_id, work_date),
  constraint staff_work_attendance_distance_check check (
    checked_in_distance_meters >= 0
    and (checked_out_distance_meters is null or checked_out_distance_meters >= 0)
  )
);

create index if not exists staff_work_attendance_school_date_idx
  on public.staff_work_attendance (school_id, work_date desc);

drop trigger if exists set_staff_work_attendance_updated_at on public.staff_work_attendance;
create trigger set_staff_work_attendance_updated_at
  before update on public.staff_work_attendance
  for each row execute function public.handle_updated_at ();

alter table public.staff_work_attendance enable row level security;
