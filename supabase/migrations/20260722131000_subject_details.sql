-- Additional subject details and cover image support.
alter table public.subjects
  add column if not exists credits numeric(5, 2) not null default 0
    check (credits >= 0),
  add column if not exists description text,
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('subject-images', 'subject-images', true)
on conflict (id) do nothing;
