-- End-of-semester grade submission and academic-review workflow.

create table if not exists public.grade_review_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_assignment_id uuid not null references public.teacher_assignments (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'revision', 'reviewed', 'approved', 'locked')),
  submitted_by uuid references public.app_users (id),
  submitted_at timestamptz,
  reviewed_by uuid references public.app_users (id),
  reviewed_at timestamptz,
  approved_by uuid references public.app_users (id),
  approved_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_assignment_id)
);

create table if not exists public.grade_review_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.grade_review_submissions (id) on delete cascade,
  status text not null
    check (status in ('draft', 'submitted', 'revision', 'reviewed', 'approved', 'locked')),
  note text,
  acted_by uuid not null references public.app_users (id),
  created_at timestamptz not null default now()
);

create index if not exists grade_review_submissions_school_status_idx
  on public.grade_review_submissions (school_id, status, updated_at desc);

create index if not exists grade_review_events_submission_created_idx
  on public.grade_review_events (submission_id, created_at desc);

alter table public.grade_review_submissions enable row level security;
alter table public.grade_review_events enable row level security;

drop trigger if exists set_grade_review_submissions_updated_at
  on public.grade_review_submissions;
create trigger set_grade_review_submissions_updated_at
  before update on public.grade_review_submissions
  for each row execute function public.handle_updated_at ();

-- Executives may view the academic-review queue by default. Schools can
-- override this preset or delegate manage access to academic-affairs staff.
insert into public.staff_type_permissions (
  school_id,
  staff_type,
  permission_key,
  access_level
)
select id, 'executive', 'grades.review', 'view'
from public.schools
on conflict (school_id, staff_type, permission_key) do nothing;

create or replace function public.seed_executive_permissions(target_school_id uuid)
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
    (target_school_id, 'executive', 'school_profile.view', 'view'),
    (target_school_id, 'executive', 'schedule.manage', 'view'),
    (target_school_id, 'executive', 'grades.review', 'view'),
    (target_school_id, 'executive', 'academic_years.manage', 'view'),
    (target_school_id, 'executive', 'classrooms.manage', 'view'),
    (target_school_id, 'executive', 'subjects.manage', 'view'),
    (target_school_id, 'executive', 'enrollments.manage', 'view'),
    (target_school_id, 'executive', 'announcements.manage', 'manage'),
    (target_school_id, 'executive', 'students.manage', 'view'),
    (target_school_id, 'executive', 'staff.manage', 'view')
  on conflict (school_id, staff_type, permission_key) do nothing;
$$;
