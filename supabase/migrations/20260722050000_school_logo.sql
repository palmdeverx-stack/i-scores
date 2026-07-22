-- School profile: logo upload support.

alter table public.schools
  add column logo_url text;

insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do nothing;
