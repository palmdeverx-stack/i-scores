-- School-scoped holiday dates. Used to skip queuing LINE attendance
-- notifications (ขาด/ลา/สาย/ไม่เข้าเรียนรายคาบ) to guardians on days the
-- school is closed, in case attendance somehow still gets recorded then.
create table if not exists public.school_holidays (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  holiday_date date not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_holidays_name_not_blank check (btrim(name) <> ''),
  constraint school_holidays_school_date_unique unique (school_id, holiday_date)
);

create index if not exists school_holidays_school_date_idx
  on public.school_holidays (school_id, holiday_date);

alter table public.school_holidays enable row level security;

create trigger set_school_holidays_updated_at
  before update on public.school_holidays
  for each row execute function public.handle_updated_at ();
