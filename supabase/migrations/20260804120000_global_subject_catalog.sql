-- Global subject catalog for personal workspaces, schools, and shared public content.
-- Operational school subjects keep their existing term/school relationships.

alter table public.subjects
  add column if not exists scope text not null default 'school';

alter table public.subjects
  drop constraint if exists subjects_scope_check,
  add constraint subjects_scope_check
    check (scope in ('system', 'personal', 'school', 'public'));

alter table public.subjects
  alter column school_id drop not null;

alter table public.subjects
  drop constraint if exists subjects_scope_owner_check,
  add constraint subjects_scope_owner_check check (
    (scope = 'school' and school_id is not null)
    or (scope in ('personal', 'public') and created_by is not null)
    or (scope = 'system' and school_id is null)
  );

create index if not exists subjects_scope_status_idx
  on public.subjects (scope, status, name);

create index if not exists subjects_catalog_owner_idx
  on public.subjects (created_by, scope, updated_at desc)
  where semester_id is null;

comment on column public.subjects.scope is
  'system/public/personal are reusable catalog entries; school is an operational school subject';

-- Indicators inherit visibility and ownership from their parent subject.
alter table public.curriculum_indicators
  alter column school_id drop not null;

drop policy if exists curriculum_indicators_school_read_policy
  on public.curriculum_indicators;

create policy curriculum_indicators_visible_read_policy
  on public.curriculum_indicators for select to authenticated
  using (
    exists (
      select 1
      from public.subjects subject
      left join public.app_users app_user
        on app_user.id = public.current_app_user_id()
      where subject.id = curriculum_indicators.subject_id
        and (
          subject.created_by = public.current_app_user_id()
          or (subject.scope = 'school' and subject.school_id = app_user.school_id)
          or (subject.scope in ('system', 'public') and subject.status = 'published')
        )
    )
  );

comment on table public.curriculum_indicators is
  'Structured indicators belonging to school, personal, system, or public catalog subjects';
