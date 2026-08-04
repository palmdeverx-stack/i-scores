-- Server-side OpenAI template generation. Prompts and generated teaching
-- content are intentionally not persisted in usage logs.

create table if not exists public.curriculum_indicators (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 100),
  description text not null check (char_length(description) between 1 and 5000),
  learning_standard text null check (char_length(learning_standard) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, code)
);

create index if not exists curriculum_indicators_school_subject_idx
  on public.curriculum_indicators (school_id, subject_id);

alter table public.curriculum_indicators enable row level security;

create policy curriculum_indicators_school_read_policy
  on public.curriculum_indicators for select to authenticated
  using (
    school_id = (
      select app_user.school_id
      from public.app_users app_user
      where app_user.id = public.current_app_user_id()
    )
  );

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  school_id uuid null references public.schools (id) on delete set null,
  feature text not null,
  action text not null,
  provider text not null,
  model text not null,
  template_type text null,
  input_tokens integer null check (input_tokens is null or input_tokens >= 0),
  output_tokens integer null check (output_tokens is null or output_tokens >= 0),
  total_tokens integer null check (total_tokens is null or total_tokens >= 0),
  request_id text null,
  idempotency_key uuid not null,
  status text not null check (status in ('pending', 'success', 'error')),
  error_code text null,
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, feature, idempotency_key)
);

create index if not exists ai_usage_logs_user_feature_created_idx
  on public.ai_usage_logs (user_id, feature, created_at desc);

alter table public.ai_usage_logs enable row level security;
-- No client policies: usage is written and read through the server service role only.

alter table public.templates
  add column if not exists ai_provider text null,
  add column if not exists ai_model text null,
  add column if not exists ai_generated_at timestamptz null,
  add column if not exists ai_action text null,
  add column if not exists ai_request_id text null;

comment on table public.ai_usage_logs is
  'AI cost/health metadata only. Never store prompts or full generated content here.';
