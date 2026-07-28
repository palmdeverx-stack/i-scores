-- Subject visibility workflow: a subject starts as a private draft, visible
-- only to whoever created it, and must be explicitly published before other
-- teachers or school admins can see it. Existing subjects are grandfathered
-- in as published so nothing already visible disappears.
alter table public.subjects
  add column if not exists created_by uuid references public.app_users (id) on delete set null,
  add column if not exists status text not null default 'published';

alter table public.subjects
  add constraint subjects_status_check check (status in ('draft', 'published'));

-- New rows should default to draft going forward; existing rows stay
-- 'published' from the column default above.
alter table public.subjects
  alter column status set default 'draft';

create index if not exists subjects_status_idx on public.subjects (status);
create index if not exists subjects_created_by_idx on public.subjects (created_by);

comment on column public.subjects.status is
  'draft = visible only to created_by; published = visible to all teachers/admins in the school';
comment on column public.subjects.created_by is
  'User who created this subject. Always retains visibility regardless of status.';
