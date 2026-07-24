-- Per-school LINE Official Account integration and guardian attendance notifications.
-- Credentials are encrypted by the application before they are stored.

alter table public.school_subscriptions
  add column if not exists max_line_notifications integer not null default 300
  check (max_line_notifications >= 0);

alter table public.subscription_plans
  add column if not exists max_line_notifications integer not null default 0
  check (max_line_notifications >= 0);

update public.school_subscriptions
set enabled_features = array_append(enabled_features, 'admin.line_notifications')
where not ('admin.line_notifications' = any(enabled_features));

update public.subscription_plans
set
  enabled_features = case
    when 'admin.line_notifications' = any(enabled_features) then enabled_features
    else array_append(enabled_features, 'admin.line_notifications')
  end,
  max_line_notifications = case
    when upper(code) = 'STARTER' then 15000
    when upper(code) = 'PROFESSIONAL' then 35000
    when upper(code) = 'ENTERPRISE' then 0
    else max_line_notifications
  end;

create table if not exists public.school_line_integrations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  channel_id text,
  channel_secret_encrypted text,
  channel_access_token_encrypted text,
  oa_basic_id text,
  is_enabled boolean not null default false,
  notify_absent boolean not null default true,
  notify_leave boolean not null default true,
  notify_late boolean not null default true,
  notify_class_absent boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_line_integrations_school_unique unique (school_id)
);

drop trigger if exists set_school_line_integrations_updated_at
  on public.school_line_integrations;
create trigger set_school_line_integrations_updated_at
  before update on public.school_line_integrations
  for each row execute function public.handle_updated_at ();

alter table public.school_line_integrations enable row level security;

alter table public.student_guardians
  add column if not exists line_user_id text,
  add column if not exists line_display_name text,
  add column if not exists line_linked_at timestamptz,
  add column if not exists line_notifications_enabled boolean not null default true;

create index if not exists student_guardians_line_user_idx
  on public.student_guardians (school_id, line_user_id)
  where line_user_id is not null;

create table if not exists public.guardian_line_link_tokens (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  guardian_id uuid not null references public.student_guardians (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_by uuid references public.app_users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint guardian_line_link_tokens_guardian_unique unique (guardian_id),
  constraint guardian_line_link_tokens_hash_unique unique (token_hash)
);

create index if not exists guardian_line_link_tokens_lookup_idx
  on public.guardian_line_link_tokens (school_id, token_hash, expires_at);

alter table public.guardian_line_link_tokens enable row level security;

create table if not exists public.line_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  guardian_id uuid not null references public.student_guardians (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  source_type text not null
    check (source_type in ('homeroom_attendance', 'class_attendance')),
  source_record_id uuid not null,
  event_type text not null
    check (event_type in ('absent', 'leave', 'late', 'class_absent')),
  message_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint line_notification_deliveries_dedupe
    unique (guardian_id, source_type, source_record_id, event_type)
);

create index if not exists line_notification_deliveries_queue_idx
  on public.line_notification_deliveries (status, next_attempt_at, created_at);

create index if not exists line_notification_deliveries_school_month_idx
  on public.line_notification_deliveries (school_id, sent_at desc);

drop trigger if exists set_line_notification_deliveries_updated_at
  on public.line_notification_deliveries;
create trigger set_line_notification_deliveries_updated_at
  before update on public.line_notification_deliveries
  for each row execute function public.handle_updated_at ();

alter table public.line_notification_deliveries enable row level security;
