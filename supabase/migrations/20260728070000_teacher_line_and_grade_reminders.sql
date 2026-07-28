-- Teacher LINE linking (mirrors the existing guardian LINE linking in
-- 20260724050000_line_guardian_notifications.sql, but keyed off app_users
-- since teachers already have real accounts — no portal-token workaround
-- needed) + grade submission deadline/reminder configuration per semester.

alter table public.app_users
  add column if not exists line_user_id text,
  add column if not exists line_display_name text,
  add column if not exists line_linked_at timestamptz,
  add column if not exists line_notifications_enabled boolean not null default true;

create unique index if not exists app_users_line_user_id_key
  on public.app_users (line_user_id) where line_user_id is not null;

create table if not exists public.teacher_line_link_tokens (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid not null references public.app_users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_by uuid references public.app_users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint teacher_line_link_tokens_teacher_unique unique (teacher_id),
  constraint teacher_line_link_tokens_hash_unique unique (token_hash)
);

alter table public.teacher_line_link_tokens enable row level security;

-- Grade submission deadline: one per semester. grade_reminder_days counts
-- back from the deadline (inclusive) — e.g. deadline=Aug 10, days=3 means
-- reminders fire on Aug 8, 9, and 10 for anyone still not submitted.
alter table public.semesters
  add column if not exists grade_submission_deadline date,
  add column if not exists grade_reminder_days integer;

alter table public.semesters
  drop constraint if exists semesters_grade_reminder_days_check;

alter table public.semesters
  add constraint semesters_grade_reminder_days_check
    check (grade_reminder_days is null or grade_reminder_days >= 1);

comment on column public.semesters.grade_submission_deadline is
  'Deadline for teachers to submit grade reviews for this semester';
comment on column public.semesters.grade_reminder_days is
  'How many days counting back from the deadline (inclusive) to send reminders';

-- One row per (teacher, semester, channel, day) actually reminded — lets the
-- daily cron dedupe/no-op via `on conflict do nothing` instead of re-sending
-- if it runs more than once on the same day, and doubles as an audit trail.
create table if not exists public.grade_reminder_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  teacher_id uuid not null references public.app_users (id) on delete cascade,
  semester_id uuid not null references public.semesters (id) on delete cascade,
  channel text not null check (channel in ('in_app', 'line')),
  sent_date date not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  constraint grade_reminder_log_dedupe unique (teacher_id, semester_id, channel, sent_date)
);

create index if not exists grade_reminder_log_semester_idx
  on public.grade_reminder_log (semester_id, sent_date);

alter table public.grade_reminder_log enable row level security;
