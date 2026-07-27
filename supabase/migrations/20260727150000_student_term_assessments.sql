-- Final subject outcomes and term assessments used by grade review and PP.5.

create table if not exists public.teacher_assignment_student_results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_assignment_id uuid not null references public.teacher_assignments (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  special_result text check (special_result is null or special_result in ('ร', 'มส', 'มผ')),
  note text,
  updated_by uuid not null references public.app_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_assignment_id, student_id)
);

create table if not exists public.student_term_assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  desirable_attributes_level smallint
    check (desirable_attributes_level is null or desirable_attributes_level between 0 and 3),
  reading_thinking_writing_level smallint
    check (reading_thinking_writing_level is null or reading_thinking_writing_level between 0 and 3),
  activity_result text
    check (activity_result is null or activity_result in ('pass', 'fail', 'pending')),
  note text,
  updated_by uuid not null references public.app_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (semester_id, student_id)
);

create index if not exists teacher_assignment_student_results_assignment_idx
  on public.teacher_assignment_student_results (teacher_assignment_id);

create index if not exists student_term_assessments_classroom_semester_idx
  on public.student_term_assessments (classroom_id, semester_id);

alter table public.teacher_assignment_student_results enable row level security;
alter table public.student_term_assessments enable row level security;

drop trigger if exists set_teacher_assignment_student_results_updated_at
  on public.teacher_assignment_student_results;
create trigger set_teacher_assignment_student_results_updated_at
  before update on public.teacher_assignment_student_results
  for each row execute function public.handle_updated_at ();

drop trigger if exists set_student_term_assessments_updated_at
  on public.student_term_assessments;
create trigger set_student_term_assessments_updated_at
  before update on public.student_term_assessments
  for each row execute function public.handle_updated_at ();
