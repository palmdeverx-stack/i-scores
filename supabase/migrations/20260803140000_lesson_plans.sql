-- Digital lesson plans authored by teachers and reviewed by academic affairs.

create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid not null references public.app_users (id) on delete cascade,
  teacher_assignment_id uuid not null references public.teacher_assignments (id) on delete cascade,
  copied_from_id uuid references public.lesson_plans (id) on delete set null,
  title text not null,
  unit_number integer not null default 1 check (unit_number > 0),
  unit_name text not null,
  duration_periods integer not null default 1 check (duration_periods > 0 and duration_periods <= 200),
  start_date date,
  end_date date,
  learning_standards text,
  indicators text,
  learning_objectives text,
  essential_content text,
  learning_activities text,
  learning_media text,
  assessment text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'revision', 'approved', 'archived')),
  version_number integer not null default 1 check (version_number > 0),
  submitted_at timestamptz,
  reviewed_by uuid references public.app_users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_plan_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null references public.lesson_plans (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null,
  change_note text,
  created_by uuid not null references public.app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lesson_plan_id, version_number)
);

create table if not exists public.lesson_plan_events (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null references public.lesson_plans (id) on delete cascade,
  status text not null
    check (status in ('draft', 'submitted', 'revision', 'approved', 'archived')),
  note text,
  acted_by uuid not null references public.app_users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists lesson_plans_teacher_updated_idx
  on public.lesson_plans (school_id, teacher_id, updated_at desc);
create index if not exists lesson_plans_review_queue_idx
  on public.lesson_plans (school_id, status, submitted_at desc);
create index if not exists lesson_plans_assignment_idx
  on public.lesson_plans (teacher_assignment_id, unit_number);
create index if not exists lesson_plan_versions_plan_idx
  on public.lesson_plan_versions (lesson_plan_id, version_number desc);
create index if not exists lesson_plan_events_plan_idx
  on public.lesson_plan_events (lesson_plan_id, created_at desc);

alter table public.lesson_plans enable row level security;
alter table public.lesson_plan_versions enable row level security;
alter table public.lesson_plan_events enable row level security;

drop trigger if exists set_lesson_plans_updated_at on public.lesson_plans;
create trigger set_lesson_plans_updated_at
  before update on public.lesson_plans
  for each row execute function public.handle_updated_at ();

-- Executives can inspect the queue by default. Schools can delegate manage
-- access to academic-affairs teachers from the existing permission screen.
insert into public.staff_type_permissions (
  school_id, staff_type, permission_key, access_level
)
select id, 'executive', 'lesson_plans.review', 'view'
from public.schools
on conflict (school_id, staff_type, permission_key) do nothing;

create or replace function public.seed_staff_type_permissions(target_school_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.staff_type_permissions (
    school_id,
    staff_type,
    permission_key,
    access_level
  )
  values
    (target_school_id, 'executive', 'dashboard.view', 'view'),
    (target_school_id, 'executive', 'schedule.approve', 'manage'),
    (target_school_id, 'executive', 'grades.approve', 'manage'),
    (target_school_id, 'executive', 'documents.access', 'view'),
    (target_school_id, 'executive', 'lesson_plans.review', 'view')
  on conflict (school_id, staff_type, permission_key) do nothing;
$$;

revoke all on function public.seed_staff_type_permissions(uuid) from public;
