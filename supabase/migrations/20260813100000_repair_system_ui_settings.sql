-- Repair installations where system_ui_settings was created before experimental menus
-- and ensure feedback storage added after the original migration is present.

alter table public.system_ui_settings
  add column if not exists experimental_menu_paths jsonb,
  add column if not exists updated_by uuid references public.app_users(id) on delete set null,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.system_ui_settings
  alter column experimental_menu_paths
    set default '["/teacher/lesson-plans"]'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.system_ui_settings
set
  experimental_menu_paths = coalesce(
    experimental_menu_paths,
    '["/teacher/lesson-plans"]'::jsonb
  ),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

update public.system_ui_settings
set experimental_menu_paths = '["/teacher/lesson-plans"]'::jsonb
where jsonb_typeof(experimental_menu_paths) is distinct from 'array';

alter table public.system_ui_settings
  alter column experimental_menu_paths set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.system_ui_settings'::regclass
      and conname = 'system_ui_settings_experimental_menu_paths_check'
  ) then
    alter table public.system_ui_settings
      add constraint system_ui_settings_experimental_menu_paths_check
      check (jsonb_typeof(experimental_menu_paths) = 'array');
  end if;
end
$$;

insert into public.system_ui_settings (singleton)
values (true)
on conflict (singleton) do nothing;

drop trigger if exists set_system_ui_settings_updated_at
  on public.system_ui_settings;
create trigger set_system_ui_settings_updated_at
  before update on public.system_ui_settings
  for each row execute function public.handle_updated_at();

create table if not exists public.experimental_feature_feedback (
  id uuid primary key default gen_random_uuid(),
  menu_path text not null,
  page_path text not null,
  category text not null check (category in ('positive', 'problem', 'add', 'remove')),
  message text not null check (char_length(message) between 3 and 2000),
  user_id uuid not null references public.app_users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  user_role text not null,
  created_at timestamptz not null default now()
);

create index if not exists experimental_feature_feedback_created_at_idx
  on public.experimental_feature_feedback (created_at desc);
create index if not exists experimental_feature_feedback_menu_path_idx
  on public.experimental_feature_feedback (menu_path, created_at desc);

alter table public.system_ui_settings enable row level security;
alter table public.experimental_feature_feedback enable row level security;

notify pgrst, 'reload schema';
