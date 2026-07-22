-- School announcements shown on the student home dashboard.
create table public.school_announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  title text not null,
  content text not null,
  priority text not null default 'normal'
    check (priority in ('normal', 'important', 'urgent')),
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_announcements_expiry_check
    check (expires_at is null or expires_at > published_at)
);

create index school_announcements_school_published_idx
  on public.school_announcements (school_id, is_published, published_at desc);

alter table public.school_announcements enable row level security;

create trigger set_school_announcements_updated_at
  before update on public.school_announcements
  for each row execute function public.handle_updated_at ();
