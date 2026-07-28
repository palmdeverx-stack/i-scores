-- Documents created by authorized school staff from the school template catalog.

create table if not exists public.school_user_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  created_by uuid not null references public.app_users (id) on delete cascade,
  template_slug text not null,
  title text not null,
  purpose text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'ready', 'cancelled')),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_user_documents_owner_updated_idx
  on public.school_user_documents (school_id, created_by, updated_at desc);

alter table public.school_user_documents enable row level security;

drop trigger if exists set_school_user_documents_updated_at
  on public.school_user_documents;
create trigger set_school_user_documents_updated_at
  before update on public.school_user_documents
  for each row execute function public.handle_updated_at ();

-- Executives can be granted document access by default. Schools may override
-- this preset per personnel type or individual in the access-permissions page.
insert into public.staff_type_permissions (
  school_id,
  staff_type,
  permission_key,
  access_level
)
select id, 'executive', 'documents.access', 'view'
from public.schools
on conflict (school_id, staff_type, permission_key) do nothing;

create or replace function public.seed_staff_type_permissions(target_school_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.staff_type_permissions (
    school_id,
    staff_type,
    permission_key,
    access_level
  )
  values
    (target_school_id, 'executive', 'dashboard.view', 'view'),
    (target_school_id, 'executive', 'schedule.approve', 'manage'),
    (target_school_id, 'executive', 'grades.approve', 'manage'),
    (target_school_id, 'executive', 'documents.access', 'view')
  on conflict (school_id, staff_type, permission_key) do nothing;
$$;

revoke all on function public.seed_staff_type_permissions(uuid) from public;
