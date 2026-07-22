-- Phase 1: core academic structure (multi-school) + new role model.
-- Replaces the flat student/instructor/admin + assignments/scores system.

drop table if exists public.scores cascade;
drop table if exists public.assignments cascade;

-- ------------------------------------------------------------------
-- Schools
-- ------------------------------------------------------------------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_by uuid references public.app_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index schools_code_key on public.schools (lower(code));

-- ------------------------------------------------------------------
-- Roles: migrate values first, while the OLD constraint still allows them
-- to be dropped, then swap in the new constraint.
-- ------------------------------------------------------------------
alter table public.app_users
  add column school_id uuid references public.schools (id);

alter table public.app_users
  alter column role drop default;

alter table public.app_users
  drop constraint app_users_role_check;

update public.app_users set role = 'master_admin' where role = 'admin';
update public.app_users set role = 'teacher' where role = 'instructor';
-- 'student' keeps its name

alter table public.app_users
  add constraint app_users_role_check check (role in ('master_admin', 'school_admin', 'teacher', 'student'));

-- ------------------------------------------------------------------
-- Academic years & semesters
-- ------------------------------------------------------------------
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  year text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, year)
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years (id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, name)
);

-- ------------------------------------------------------------------
-- Classrooms & subjects
-- ------------------------------------------------------------------
create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  academic_year_id uuid not null references public.academic_years (id) on delete cascade,
  name text not null,
  grade_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  code text,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

-- ------------------------------------------------------------------
-- Teacher assignments (who teaches what, where, when)
-- ------------------------------------------------------------------
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.app_users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, subject_id, classroom_id, semester_id)
);

-- ------------------------------------------------------------------
-- Enrollments (student -> classroom)
-- ------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.app_users (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  student_number text,
  created_at timestamptz not null default now(),
  unique (student_id, classroom_id)
);

alter table public.schools enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.classrooms enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.enrollments enable row level security;

create trigger set_schools_updated_at
  before update on public.schools
  for each row execute function public.handle_updated_at ();

create trigger set_academic_years_updated_at
  before update on public.academic_years
  for each row execute function public.handle_updated_at ();

create trigger set_semesters_updated_at
  before update on public.semesters
  for each row execute function public.handle_updated_at ();

create trigger set_classrooms_updated_at
  before update on public.classrooms
  for each row execute function public.handle_updated_at ();

create trigger set_subjects_updated_at
  before update on public.subjects
  for each row execute function public.handle_updated_at ();

-- ------------------------------------------------------------------
-- Migrate existing data: seed a default school so any pre-existing
-- school_admin/teacher/student rows have somewhere to belong, BEFORE
-- the school-required constraint goes on.
-- ------------------------------------------------------------------
do $$
declare
  default_school_id uuid;
begin
  insert into public.schools (name, code, created_by)
  select 'Default School', 'DEFAULT', id from public.app_users where role = 'master_admin' limit 1
  returning id into default_school_id;

  update public.app_users
  set school_id = default_school_id
  where role in ('school_admin', 'teacher', 'student') and school_id is null;
end $$;

alter table public.app_users
  add constraint app_users_school_required_check
  check (role = 'master_admin' or school_id is not null);
