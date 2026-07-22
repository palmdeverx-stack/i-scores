-- Images and documents attached to assignments.

create table public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create index assignment_attachments_assignment_idx
  on public.assignment_attachments (assignment_id, created_at);

alter table public.assignment_attachments enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('assignment-attachments', 'assignment-attachments', true, 10485760)
on conflict (id) do nothing;
