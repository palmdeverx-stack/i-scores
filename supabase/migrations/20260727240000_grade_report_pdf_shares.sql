-- One secure, expiring PDF report per student for every approved subject
-- in a classroom and semester.

create table if not exists public.grade_result_delivery_batches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_result_delivery_batches_scope_unique
    unique (school_id, classroom_id, semester_id)
);

drop trigger if exists set_grade_result_delivery_batches_updated_at
  on public.grade_result_delivery_batches;
create trigger set_grade_result_delivery_batches_updated_at
  before update on public.grade_result_delivery_batches
  for each row execute function public.handle_updated_at ();

create index if not exists grade_result_delivery_batches_school_idx
  on public.grade_result_delivery_batches (school_id, created_at desc);

alter table public.grade_result_delivery_batches enable row level security;

create table if not exists public.grade_report_share_tokens (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.grade_result_delivery_batches (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  guardian_id uuid not null references public.student_guardians (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  last_accessed_at timestamptz,
  download_count integer not null default 0 check (download_count >= 0),
  revoked_at timestamptz,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint grade_report_share_tokens_hash_unique unique (token_hash),
  constraint grade_report_share_tokens_guardian_batch_unique unique (batch_id, guardian_id)
);

create index if not exists grade_report_share_tokens_lookup_idx
  on public.grade_report_share_tokens (token_hash, expires_at)
  where revoked_at is null;

alter table public.grade_report_share_tokens enable row level security;
