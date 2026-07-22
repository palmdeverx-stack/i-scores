-- Assignments (score items) and scores, scoped to a specific teacher_assignment
-- (i.e. one teacher teaching one subject to one classroom in one semester).

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_assignment_id uuid not null references public.teacher_assignments (id) on delete cascade,
  title text not null,
  description text,
  full_score numeric not null default 100 check (full_score > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  score numeric not null check (score >= 0),
  feedback text,
  graded_by uuid not null references public.app_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table public.assignments enable row level security;
alter table public.scores enable row level security;

create trigger set_assignments_updated_at
  before update on public.assignments
  for each row execute function public.handle_updated_at ();

create trigger set_scores_updated_at
  before update on public.scores
  for each row execute function public.handle_updated_at ();
