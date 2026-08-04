-- Reusable, composable lesson-plan sections. Approved lesson_plans remain available
-- as legacy whole-document templates; this catalog stores independent components.

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_users (id) on delete cascade,
  school_id uuid references public.schools (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  template_type text not null check (template_type in (
    'learning_objective', 'essential_content', 'learning_content',
    'learning_activity', 'assessment', 'rubric', 'media', 'question',
    'reflection', 'lesson_plan'
  )),
  scope text not null default 'personal'
    check (scope in ('personal', 'school', 'system', 'marketplace')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  subject_id uuid references public.subjects (id) on delete set null,
  course_id uuid,
  grade_levels text[] not null default '{}',
  indicator_ids uuid[] not null default '{}',
  source_template_id uuid references public.templates (id) on delete set null,
  version integer not null default 1 check (version > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint templates_scope_school_check check (
    (scope = 'personal') or
    (scope = 'system' and school_id is null) or
    (scope in ('school', 'marketplace') and school_id is not null)
  )
);

create table if not exists public.lesson_plan_template_usages (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null references public.lesson_plans (id) on delete cascade,
  section_type text not null,
  template_id uuid references public.templates (id) on delete set null,
  template_version integer not null check (template_version > 0),
  content_snapshot jsonb not null,
  applied_by uuid not null references public.app_users (id) on delete cascade,
  applied_at timestamptz not null default now()
);

create table if not exists public.marketplace_template_entitlements (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates (id) on delete cascade,
  owner_id uuid not null references public.app_users (id) on delete cascade,
  marketplace_product_id text,
  acquired_at timestamptz not null default now(),
  unique (template_id, owner_id)
);

create index if not exists templates_owner_idx on public.templates (owner_id);
create index if not exists templates_school_idx on public.templates (school_id);
create index if not exists templates_type_idx on public.templates (template_type);
create index if not exists templates_scope_idx on public.templates (scope);
create index if not exists templates_status_idx on public.templates (status);
create index if not exists templates_subject_idx on public.templates (subject_id);
create index if not exists templates_created_idx on public.templates (created_at desc);
create index if not exists templates_tags_idx on public.templates using gin (tags);
create index if not exists templates_grade_levels_idx on public.templates using gin (grade_levels);
create index if not exists lesson_plan_template_usages_plan_idx
  on public.lesson_plan_template_usages (lesson_plan_id, section_type, applied_at desc);

drop trigger if exists set_templates_updated_at on public.templates;
create trigger set_templates_updated_at
  before update on public.templates
  for each row execute function public.handle_updated_at ();

alter table public.templates enable row level security;
alter table public.lesson_plan_template_usages enable row level security;
alter table public.marketplace_template_entitlements enable row level security;

-- Resolve the active E-KRU profile from the shared Supabase Auth identity.
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.app_users
  where auth_user_id = auth.uid()
    and is_active = true
  order by (school_id::text = coalesce(auth.jwt() -> 'app_metadata' ->> 'school_id', '')) desc
  limit 1;
$$;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to authenticated;

create or replace function public.can_manage_school_templates(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users app_user
    where app_user.id = public.current_app_user_id()
      and app_user.school_id = target_school_id
      and (
        app_user.role = 'school_admin'
        or exists (
          select 1 from public.staff_permission_overrides permission_override
          where permission_override.user_id = app_user.id
            and permission_override.school_id = target_school_id
            and permission_override.permission_key = 'teaching.assignments'
            and permission_override.access_level = 'manage'
        )
        or (
          not exists (
            select 1 from public.staff_permission_overrides permission_override
            where permission_override.user_id = app_user.id
              and permission_override.permission_key = 'teaching.assignments'
              and permission_override.access_level in ('none', 'view')
          )
          and (
            exists (
              select 1 from public.staff_type_permissions type_permission
              where type_permission.school_id = target_school_id
                and type_permission.staff_type = app_user.staff_type
                and type_permission.permission_key = 'teaching.assignments'
                and type_permission.access_level = 'manage'
            )
            or exists (
              select 1
              from public.department_members member
              join public.department_permissions department_permission
                on department_permission.department_id = member.department_id
              join public.department_member_permissions member_permission
                on member_permission.member_id = member.id
               and member_permission.permission_key = department_permission.permission_key
              where member.teacher_id = app_user.id
                and department_permission.permission_key = 'teaching.assignments'
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_manage_school_templates(uuid) from public;
grant execute on function public.can_manage_school_templates(uuid) to authenticated;

create policy templates_select_policy on public.templates
  for select to authenticated
  using (
    owner_id = public.current_app_user_id()
    or (scope = 'school' and school_id = (
      select school_id from public.app_users where id = public.current_app_user_id()
    ))
    or (scope = 'system' and status = 'active')
    or (scope = 'marketplace' and status = 'active' and exists (
      select 1 from public.marketplace_template_entitlements entitlement
      where entitlement.template_id = templates.id
        and entitlement.owner_id = public.current_app_user_id()
    ))
  );

create policy templates_insert_policy on public.templates
  for insert to authenticated
  with check (
    owner_id = public.current_app_user_id()
    and scope in ('personal', 'school')
    and (
      scope = 'personal'
      or (
        school_id = (select school_id from public.app_users where id = public.current_app_user_id())
        and public.can_manage_school_templates(school_id)
      )
    )
  );

create policy templates_update_policy on public.templates
  for update to authenticated
  using (
    (scope = 'personal' and owner_id = public.current_app_user_id())
    or (scope = 'school' and public.can_manage_school_templates(school_id))
  )
  with check (
    (scope = 'personal' and owner_id = public.current_app_user_id())
    or (scope = 'school' and public.can_manage_school_templates(school_id))
  );

create policy templates_delete_policy on public.templates
  for delete to authenticated
  using (
    (scope = 'personal' and owner_id = public.current_app_user_id())
    or (scope = 'school' and public.can_manage_school_templates(school_id))
  );

create policy lesson_plan_template_usages_select_policy
  on public.lesson_plan_template_usages for select to authenticated
  using (exists (
    select 1 from public.lesson_plans lp
    where lp.id = lesson_plan_id and lp.teacher_id = public.current_app_user_id()
  ));

create policy lesson_plan_template_usages_write_policy
  on public.lesson_plan_template_usages for all to authenticated
  using (applied_by = public.current_app_user_id())
  with check (
    applied_by = public.current_app_user_id()
    and exists (
      select 1 from public.lesson_plans lp
      where lp.id = lesson_plan_id and lp.teacher_id = public.current_app_user_id()
    )
  );

create policy marketplace_template_entitlements_select_policy
  on public.marketplace_template_entitlements for select to authenticated
  using (owner_id = public.current_app_user_id());

comment on table public.templates is
  'Independent, reusable components and whole-document templates for lesson planning';
comment on table public.lesson_plan_template_usages is
  'Immutable snapshots of templates copied into lesson-plan sections';
