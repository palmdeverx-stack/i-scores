create table if not exists public.school_duty_schedules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  duty_date date not null,
  shift text not null check (shift in ('morning', 'evening')),
  starts_at time not null,
  ends_at time not null,
  location text not null,
  note text,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_duty_schedules_time_check check (ends_at > starts_at),
  constraint school_duty_schedules_location_check check (char_length(trim(location)) between 1 and 120),
  constraint school_duty_schedules_unique unique (school_id, duty_date, shift, location)
);

create index if not exists school_duty_schedules_school_date_idx
  on public.school_duty_schedules (school_id, duty_date, starts_at);

drop trigger if exists set_school_duty_schedules_updated_at on public.school_duty_schedules;
create trigger set_school_duty_schedules_updated_at
  before update on public.school_duty_schedules
  for each row execute function public.handle_updated_at ();

alter table public.school_duty_schedules enable row level security;

create table if not exists public.school_duty_assignees (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.school_duty_schedules (id) on delete cascade,
  staff_id uuid not null references public.app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint school_duty_assignees_unique unique (schedule_id, staff_id)
);

create index if not exists school_duty_assignees_staff_idx
  on public.school_duty_assignees (staff_id, schedule_id);

alter table public.school_duty_assignees enable row level security;
