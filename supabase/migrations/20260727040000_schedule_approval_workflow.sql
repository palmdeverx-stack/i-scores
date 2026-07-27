-- Director sign-off workflow: a department finishes a classroom's schedule,
-- submits it, the school director confirms it, and the homeroom teacher(s)
-- get notified. "Director" isn't school_admin — it's a dedicated flag a
-- school_admin can grant to any teacher, independent of department
-- permissions (which are department-scoped; a director oversees the whole
-- school).

alter table public.app_users
  add column is_school_director boolean not null default false;

create table public.classroom_schedule_approvals (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved')),
  submitted_by uuid references public.app_users (id),
  submitted_at timestamptz,
  approved_by uuid references public.app_users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (classroom_id, semester_id)
);

create index classroom_schedule_approvals_school_status_idx
  on public.classroom_schedule_approvals (school_id, status);

alter table public.classroom_schedule_approvals enable row level security;

create trigger set_classroom_schedule_approvals_updated_at
  before update on public.classroom_schedule_approvals
  for each row execute function public.handle_updated_at ();

-- Minimal generic in-app notification inbox — nothing used this before
-- (the template's NotificationsDrawer was mock-data only and never wired up).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
