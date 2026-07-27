-- Store the director's drawn signature with each approved classroom schedule.

alter table public.classroom_schedule_approvals
  add column if not exists signature_url text,
  add column if not exists signature_signed_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'schedule-approval-signatures',
  'schedule-approval-signatures',
  true,
  2097152,
  array['image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
