-- Track submission status per student per assignment, independent of the
-- numeric score (a student can be marked "not submitted" before any score
-- is entered).

alter table public.scores
  alter column score drop not null;

alter table public.scores
  add column status text not null default 'submitted'
  check (status in ('submitted', 'late', 'not_submitted', 'absent', 'sick_leave', 'pending_review'));
