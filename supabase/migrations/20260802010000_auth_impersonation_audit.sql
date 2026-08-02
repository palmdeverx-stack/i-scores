-- Audits every Master Admin preview session. Application APIs use the service
-- role; RLS intentionally exposes no direct client access.

create table if not exists public.auth_impersonation_audit (
  id uuid primary key default gen_random_uuid(),
  master_user_id uuid not null references public.app_users(id) on delete restrict,
  target_user_id uuid not null references public.app_users(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint auth_impersonation_different_users_check
    check (master_user_id <> target_user_id)
);

create index if not exists auth_impersonation_audit_master_started_idx
  on public.auth_impersonation_audit (master_user_id, started_at desc);

create index if not exists auth_impersonation_audit_school_started_idx
  on public.auth_impersonation_audit (school_id, started_at desc);

alter table public.auth_impersonation_audit enable row level security;
