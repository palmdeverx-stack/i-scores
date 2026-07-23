-- Commercial subscription and entitlement controls per school.
create table if not exists public.school_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  plan_name text not null default 'Trial',
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'suspended', 'canceled')),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'yearly', 'custom')),
  price numeric(12, 2) not null default 0 check (price >= 0),
  currency text not null default 'THB',
  starts_at date not null default current_date,
  ends_at date default (current_date + 30),
  max_school_admins integer not null default 1 check (max_school_admins >= 0),
  max_teachers integer not null default 20 check (max_teachers >= 0),
  max_students integer not null default 500 check (max_students >= 0),
  enabled_features text[] not null default array[
    'admin.school_profile',
    'admin.academic_years',
    'admin.classrooms',
    'admin.subjects',
    'admin.staff',
    'admin.students',
    'admin.teacher_assignments',
    'admin.enrollments',
    'teacher.assignments',
    'teacher.students',
    'teacher.timetable',
    'teacher.announcements',
    'student.subjects',
    'student.assignments',
    'student.attendance'
  ]::text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_subscriptions_school_unique unique (school_id),
  constraint school_subscriptions_date_check check (ends_at is null or ends_at >= starts_at)
);

create index if not exists school_subscriptions_status_idx
  on public.school_subscriptions (status, ends_at);

drop trigger if exists set_school_subscriptions_updated_at on public.school_subscriptions;
create trigger set_school_subscriptions_updated_at
  before update on public.school_subscriptions
  for each row execute function public.handle_updated_at ();

alter table public.school_subscriptions enable row level security;

insert into public.school_subscriptions (school_id)
select id from public.schools
on conflict (school_id) do nothing;

create or replace function public.create_default_school_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.school_subscriptions (school_id)
  values (new.id)
  on conflict (school_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_school_subscription_after_insert on public.schools;
create trigger create_school_subscription_after_insert
  after insert on public.schools
  for each row execute function public.create_default_school_subscription();
