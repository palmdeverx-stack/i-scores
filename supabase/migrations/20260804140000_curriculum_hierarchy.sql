-- Reusable hierarchy: curriculum -> subject -> outcomes/units -> lesson plan.

create table if not exists public.curricula (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete cascade,
  owner_id uuid references public.app_users (id) on delete cascade,
  code text,
  name text not null check (char_length(name) between 1 and 300),
  version text,
  curriculum_type text not null default 'custom'
    check (curriculum_type in ('core', 'school', 'custom')),
  scope text not null default 'personal'
    check (scope in ('system', 'school', 'personal', 'public')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curricula_scope_owner_check check (
    (scope = 'system' and school_id is null and owner_id is null)
    or (scope = 'school' and school_id is not null)
    or (scope in ('personal', 'public') and owner_id is not null)
  )
);

insert into public.curricula (
  id, code, name, version, curriculum_type, scope, status
) values (
  '25510000-0000-4000-8000-000000002560',
  'OBEC-BE-2551-2560',
  'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน',
  'พ.ศ. 2551 (ฉบับปรับปรุง พ.ศ. 2560)',
  'core', 'system', 'published'
) on conflict (id) do nothing;

alter table public.subjects
  add column if not exists curriculum_id uuid references public.curricula (id) on delete set null;

create table if not exists public.subject_learning_outcomes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  code text,
  description text not null check (char_length(description) between 1 and 10000),
  sequence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, code)
);

create table if not exists public.subject_learning_units (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  code text,
  name text not null check (char_length(name) between 1 and 500),
  description text,
  sequence integer not null default 0,
  estimated_periods integer check (estimated_periods is null or estimated_periods between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, code)
);

insert into public.subject_learning_outcomes (subject_id, description, sequence)
select id, left(btrim(regexp_replace(learning_outcomes, '<[^>]+>', ' ', 'g')), 10000), 0
from public.subjects
where nullif(btrim(regexp_replace(coalesce(learning_outcomes, ''), '<[^>]+>', ' ', 'g')), '') is not null
  and not exists (
    select 1 from public.subject_learning_outcomes outcome where outcome.subject_id = subjects.id
  );

insert into public.subject_learning_units (subject_id, name, sequence)
select id, left(btrim(regexp_replace(learning_units, '<[^>]+>', ' ', 'g')), 500), 0
from public.subjects
where nullif(btrim(regexp_replace(coalesce(learning_units, ''), '<[^>]+>', ' ', 'g')), '') is not null
  and not exists (
    select 1 from public.subject_learning_units unit where unit.subject_id = subjects.id
  );

alter table public.lesson_plans
  add column if not exists curriculum_id uuid references public.curricula (id) on delete set null,
  add column if not exists unit_id uuid references public.subject_learning_units (id) on delete set null,
  add column if not exists learning_outcome_ids uuid[] not null default '{}';

alter table public.templates
  add column if not exists curriculum_id uuid references public.curricula (id) on delete set null,
  add column if not exists unit_id uuid references public.subject_learning_units (id) on delete set null,
  add column if not exists learning_outcome_ids uuid[] not null default '{}';

update public.lesson_plans lesson_plan
set curriculum_id = subject.curriculum_id
from public.subjects subject
where lesson_plan.subject_id = subject.id and lesson_plan.curriculum_id is null;

create index if not exists curricula_scope_status_idx on public.curricula (scope, status, name);
create index if not exists curricula_owner_idx on public.curricula (owner_id, updated_at desc);
create index if not exists subject_learning_outcomes_subject_idx
  on public.subject_learning_outcomes (subject_id, sequence);
create index if not exists subject_learning_units_subject_idx
  on public.subject_learning_units (subject_id, sequence);
create index if not exists subjects_curriculum_idx on public.subjects (curriculum_id);

alter table public.curricula enable row level security;
alter table public.subject_learning_outcomes enable row level security;
alter table public.subject_learning_units enable row level security;

comment on table public.curricula is 'Reusable system, school, personal, or public curricula.';
comment on table public.subject_learning_outcomes is
  'Course-level outcomes selected by lesson plans; never copied into lesson objectives.';
comment on table public.subject_learning_units is
  'Reusable course units selected by lesson plans; plans keep their own title snapshot.';
