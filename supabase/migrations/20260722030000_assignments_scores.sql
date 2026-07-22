-- Gradebook: assignments created by instructors/admins, scores given to students.

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.app_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  score numeric not null check (score >= 0 and score <= 100),
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
