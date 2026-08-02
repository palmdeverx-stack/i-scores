-- Central session revocation, security audit trail, and private sensitive files.

alter table public.app_users
  add column if not exists session_revoked_at timestamptz;

alter table public.marketplace_users
  add column if not exists session_revoked_at timestamptz;

create or replace function public.revoke_session_on_security_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_active is distinct from new.is_active
     or old.role is distinct from new.role
     or old.school_id is distinct from new.school_id
     or old.password_hash is distinct from new.password_hash
     or old.student_status is distinct from new.student_status then
    new.session_revoked_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists revoke_app_user_session_on_security_change on public.app_users;
create trigger revoke_app_user_session_on_security_change
before update on public.app_users
for each row execute function public.revoke_session_on_security_change();

create or replace function public.revoke_marketplace_session_on_security_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_active is distinct from new.is_active
     or old.role is distinct from new.role then
    new.session_revoked_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists revoke_marketplace_session_on_security_change on public.marketplace_users;
create trigger revoke_marketplace_session_on_security_change
before update on public.marketplace_users
for each row execute function public.revoke_marketplace_session_on_security_change();

create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null check (char_length(action) between 3 and 120),
  actor_user_id uuid references public.app_users(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  target_type text,
  target_id text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_audit_log_created_idx
  on public.security_audit_log(created_at desc);
create index if not exists security_audit_log_actor_idx
  on public.security_audit_log(actor_user_id, created_at desc);
alter table public.security_audit_log enable row level security;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

alter table public.classroom_schedule_approvals
  add column if not exists signature_path text,
  add column if not exists submitter_signature_path text;

update public.classroom_schedule_approvals
set signature_path = substring(signature_url from '/schedule-approval-signatures/([^?]+)')
where signature_path is null and signature_url is not null;

update public.classroom_schedule_approvals
set submitter_signature_path = substring(submitter_signature_url from '/schedule-approval-signatures/([^?]+)')
where submitter_signature_path is null and submitter_signature_url is not null;

update storage.buckets
set public = false
where id in ('assignment-attachments', 'schedule-approval-signatures');

update public.assignment_attachments
set file_url = '/api/assignments/attachments/' || id::text || '/download';
