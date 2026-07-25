-- Departments ("ฝ่าย"): school-defined groupings of teachers, each with a
-- head and members, used to scope an internal announcement board and to
-- show a "งานฝ่าย" menu only to teachers who belong to one.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.department_members (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  teacher_id uuid not null references public.app_users (id) on delete cascade,
  role_in_department text not null default 'member'
    check (role_in_department in ('head', 'member')),
  created_at timestamptz not null default now(),
  unique (department_id, teacher_id),
  unique (teacher_id)
);

create table public.announcement_departments (
  announcement_id uuid not null references public.school_announcements (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (announcement_id, department_id)
);

create index department_members_department_idx on public.department_members (department_id);
create index announcement_departments_department_idx
  on public.announcement_departments (department_id, announcement_id);

alter table public.departments enable row level security;
alter table public.department_members enable row level security;
alter table public.announcement_departments enable row level security;

create trigger set_departments_updated_at
  before update on public.departments
  for each row execute function public.handle_updated_at ();
