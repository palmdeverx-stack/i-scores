-- School-defined period structure for semester timetables.

create table if not exists public.schedule_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  period_number integer,
  name text not null,
  start_time time not null,
  end_time time not null,
  is_break boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_periods_time_check check (start_time < end_time),
  constraint schedule_periods_number_check check (
    (is_break and period_number is null)
    or (not is_break and period_number is not null and period_number > 0)
  ),
  constraint schedule_periods_name_length_check check (char_length(name) between 1 and 100),
  unique (school_id, semester_id, start_time, end_time)
);

create unique index if not exists schedule_periods_semester_number_idx
  on public.schedule_periods (school_id, semester_id, period_number)
  where period_number is not null;

create index if not exists schedule_periods_semester_time_idx
  on public.schedule_periods (school_id, semester_id, start_time);

alter table public.schedule_periods enable row level security;

drop trigger if exists set_schedule_periods_updated_at on public.schedule_periods;
create trigger set_schedule_periods_updated_at
  before update on public.schedule_periods
  for each row execute function public.handle_updated_at ();

alter table public.teaching_schedules
  add column if not exists schedule_period_id uuid
  references public.schedule_periods (id) on delete set null;

create index if not exists teaching_schedules_period_idx
  on public.teaching_schedules (schedule_period_id);
