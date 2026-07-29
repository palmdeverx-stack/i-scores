-- Non-secret system-wide email sender settings managed by master admins.
-- RESEND_API_KEY remains an environment secret and is never stored here.

create table if not exists public.system_email_settings (
  singleton boolean primary key default true check (singleton),
  resend_from_email text not null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_email_settings enable row level security;

drop trigger if exists set_system_email_settings_updated_at
  on public.system_email_settings;
create trigger set_system_email_settings_updated_at
  before update on public.system_email_settings
  for each row execute function public.handle_updated_at();
