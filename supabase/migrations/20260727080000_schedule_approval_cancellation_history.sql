-- Preserve canceled schedule submissions so they remain visible in history.

alter table public.classroom_schedule_approvals
  add column if not exists canceled_by uuid references public.app_users (id),
  add column if not exists canceled_at timestamptz;

alter table public.classroom_schedule_approvals
  drop constraint if exists classroom_schedule_approvals_status_check;

alter table public.classroom_schedule_approvals
  add constraint classroom_schedule_approvals_status_check
  check (status in ('draft', 'submitted', 'approved', 'canceled'));
