-- System-wide UI flags managed by master admins.

create table if not exists public.system_ui_settings (
  singleton boolean primary key default true check (singleton),
  experimental_menu_paths jsonb not null default '["/teacher/lesson-plans"]'::jsonb
    check (jsonb_typeof(experimental_menu_paths) = 'array'),
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_ui_settings enable row level security;

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

alter table public.experimental_feature_feedback enable row level security;
