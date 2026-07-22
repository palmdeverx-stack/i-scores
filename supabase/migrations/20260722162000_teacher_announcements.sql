-- Targeted announcements managed by teachers.

alter table public.school_announcements
  add column if not exists announcement_type text not null default 'general'
    check (announcement_type in ('general', 'holiday', 'exam')),
  add column if not exists event_start timestamptz,
  add column if not exists event_end timestamptz;

alter table public.school_announcements
  add constraint school_announcements_event_range_check
  check (event_end is null or event_start is null or event_end >= event_start);

create table public.announcement_classrooms (
  announcement_id uuid not null references public.school_announcements (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (announcement_id, classroom_id)
);

create index announcement_classrooms_classroom_idx
  on public.announcement_classrooms (classroom_id, announcement_id);

alter table public.announcement_classrooms enable row level security;
