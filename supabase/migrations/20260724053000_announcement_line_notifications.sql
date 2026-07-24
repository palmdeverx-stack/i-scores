-- Announcement images and LINE delivery support.

alter table public.school_announcements
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-images',
  'announcement-images',
  true,
  5242880,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.line_notification_deliveries
  drop constraint if exists line_notification_deliveries_source_type_check,
  drop constraint if exists line_notification_deliveries_event_type_check;

alter table public.line_notification_deliveries
  add constraint line_notification_deliveries_source_type_check
    check (source_type in ('homeroom_attendance', 'class_attendance', 'announcement')),
  add constraint line_notification_deliveries_event_type_check
    check (event_type in ('absent', 'leave', 'late', 'class_absent', 'announcement')),
  add column if not exists image_url text;
