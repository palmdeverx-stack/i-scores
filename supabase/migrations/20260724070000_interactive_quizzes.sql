-- Interactive multiple-choice quizzes backed by the existing assignments/gradebook.

create table public.quiz_settings (
  assignment_id uuid primary key references public.assignments (id) on delete cascade,
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes between 1 and 300),
  shuffle_questions boolean not null default false,
  show_score_after_submit boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  prompt text not null check (char_length(trim(prompt)) between 1 and 2000),
  points numeric not null check (points > 0),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, position)
);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 1000),
  is_correct boolean not null default false,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (question_id, position)
);

create unique index quiz_options_one_correct_per_question
  on public.quiz_options (question_id)
  where is_correct;

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric check (score is null or score >= 0),
  max_score numeric check (max_score is null or max_score > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  selected_option_id uuid not null references public.quiz_options (id) on delete restrict,
  is_correct boolean not null,
  points_awarded numeric not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index quiz_questions_assignment_position_idx
  on public.quiz_questions (assignment_id, position);
create index quiz_options_question_position_idx
  on public.quiz_options (question_id, position);
create index quiz_attempts_student_idx
  on public.quiz_attempts (student_id, assignment_id);
create index quiz_answers_attempt_idx
  on public.quiz_answers (attempt_id);

alter table public.quiz_settings enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

create trigger set_quiz_settings_updated_at
  before update on public.quiz_settings
  for each row execute function public.handle_updated_at ();

create trigger set_quiz_questions_updated_at
  before update on public.quiz_questions
  for each row execute function public.handle_updated_at ();

create trigger set_quiz_attempts_updated_at
  before update on public.quiz_attempts
  for each row execute function public.handle_updated_at ();
