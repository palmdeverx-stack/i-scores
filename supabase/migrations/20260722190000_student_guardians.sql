-- Contact information for one or more guardians belonging to a student.

create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.app_users (id) on delete cascade,
  full_name text not null,
  relationship text not null,
  phone text not null,
  email text,
  occupation text,
  address text,
  notes text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_guardians_student_id_idx
  on public.student_guardians (student_id);

create unique index if not exists student_guardians_one_primary_idx
  on public.student_guardians (student_id)
  where is_primary;

drop trigger if exists set_student_guardians_updated_at on public.student_guardians;
create trigger set_student_guardians_updated_at
  before update on public.student_guardians
  for each row execute function public.handle_updated_at ();

alter table public.student_guardians enable row level security;
