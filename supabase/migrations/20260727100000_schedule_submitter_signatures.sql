-- Require the schedule preparer to sign before the director can review it.

alter table public.classroom_schedule_approvals
  add column if not exists submitter_signature_url text,
  add column if not exists submitter_signature_signed_at timestamptz;
