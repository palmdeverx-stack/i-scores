-- Short-lived, one-time codes used to authenticate a linked guardian before
-- exposing student profile and attendance data in the Parent Portal.

create table if not exists public.guardian_portal_login_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  line_user_id text not null,
  student_id uuid not null references public.app_users (id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guardian_portal_login_codes_lookup_idx
  on public.guardian_portal_login_codes
  (school_id, line_user_id, student_id, created_at desc);

create index if not exists guardian_portal_login_codes_expiry_idx
  on public.guardian_portal_login_codes (expires_at)
  where consumed_at is null;

alter table public.guardian_portal_login_codes enable row level security;
