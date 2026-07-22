-- Optional submission deadline for each assignment.

alter table public.assignments
  add column if not exists due_at timestamptz;

create index if not exists assignments_due_at_idx
  on public.assignments (due_at)
  where due_at is not null;

comment on column public.assignments.due_at is
  'Date and time after which the assignment is considered overdue.';
