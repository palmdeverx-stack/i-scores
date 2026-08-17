create table if not exists public.school_time_settings (
  school_id uuid primary key references public.schools (id) on delete cascade,
  timezone text not null default 'Asia/Bangkok',
  active_weekdays smallint[] not null default array[1, 2, 3, 4, 5]::smallint[],
  arrival_open_time time not null default '06:00',
  school_start_time time not null default '08:00',
  late_after_time time not null default '08:00',
  school_end_time time not null default '16:00',
  departure_close_time time not null default '18:00',
  bell_sync_enabled boolean not null default false,
  updated_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_time_settings_weekdays_check check (cardinality(active_weekdays) between 1 and 7),
  constraint school_time_settings_arrival_check check (
    arrival_open_time <= school_start_time
    and school_start_time <= late_after_time
  ),
  constraint school_time_settings_departure_check check (
    late_after_time < school_end_time
    and school_end_time <= departure_close_time
  )
);

drop trigger if exists set_school_time_settings_updated_at on public.school_time_settings;
create trigger set_school_time_settings_updated_at
  before update on public.school_time_settings
  for each row execute function public.handle_updated_at ();

alter table public.school_time_settings enable row level security;

create table if not exists public.school_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  period_number smallint not null,
  name text not null,
  period_type text not null default 'class'
    check (period_type in ('class', 'assembly', 'break', 'lunch', 'activity')),
  starts_at time not null,
  ends_at time not null,
  ring_at_start boolean not null default true,
  ring_at_end boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_periods_number_check check (period_number between 1 and 99),
  constraint school_periods_name_check check (char_length(trim(name)) between 1 and 120),
  constraint school_periods_time_check check (ends_at > starts_at),
  constraint school_periods_school_number_unique unique (school_id, period_number)
);

create index if not exists school_periods_school_time_idx
  on public.school_periods (school_id, starts_at, period_number);

drop trigger if exists set_school_periods_updated_at on public.school_periods;
create trigger set_school_periods_updated_at
  before update on public.school_periods
  for each row execute function public.handle_updated_at ();

alter table public.school_periods enable row level security;
