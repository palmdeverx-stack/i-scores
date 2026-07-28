-- School-scoped master data for subject classification. Mirrors
-- staff_master_items: schools get the OBEC presets seeded automatically and
-- may rename, reorder, deactivate, or add their own custom entries.
-- subjects.learning_area / subjects.subject_type keep storing the stable
-- `code` (not the display name), so renaming an item never breaks existing
-- subjects.

create table if not exists public.subject_master_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  category text not null check (category in ('learning_area', 'subject_type')),
  code text not null,
  name text not null,
  name_en text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_master_items_name_not_blank check (btrim(name) <> ''),
  constraint subject_master_items_code_not_blank check (btrim(code) <> ''),
  constraint subject_master_items_name_en_not_blank
    check (name_en is null or btrim(name_en) <> ''),
  unique (school_id, category, name),
  unique (school_id, category, code)
);

create index if not exists subject_master_items_school_category_idx
  on public.subject_master_items (school_id, category, is_active, sort_order);

alter table public.subject_master_items enable row level security;

create trigger set_subject_master_items_updated_at
  before update on public.subject_master_items
  for each row execute function public.handle_updated_at ();

-- The learning_area / subject_type text columns are no longer restricted to
-- a fixed global list — each school now manages its own master list.
alter table public.subjects
  drop constraint if exists subjects_learning_area_check,
  drop constraint if exists subjects_subject_type_check;

create or replace function public.seed_subject_master_items(target_school_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.subject_master_items (
    school_id, category, code, name, name_en, sort_order, is_system
  )
  select
    target_school_id, preset.category, preset.code, preset.name, preset.name_en,
    preset.sort_order, true
  from (
    values
      ('learning_area', 'thai', 'ภาษาไทย', 'Thai Language', 10),
      ('learning_area', 'mathematics', 'คณิตศาสตร์', 'Mathematics', 20),
      (
        'learning_area', 'science_technology', 'วิทยาศาสตร์และเทคโนโลยี',
        'Science and Technology', 30
      ),
      (
        'learning_area', 'social_studies', 'สังคมศึกษา ศาสนา และวัฒนธรรม',
        'Social Studies, Religion and Culture', 40
      ),
      (
        'learning_area', 'health_pe', 'สุขศึกษาและพลศึกษา',
        'Health and Physical Education', 50
      ),
      ('learning_area', 'art', 'ศิลปะ', 'Art', 60),
      (
        'learning_area', 'occupations_technology', 'การงานอาชีพ',
        'Occupations and Technology', 70
      ),
      ('learning_area', 'foreign_language', 'ภาษาต่างประเทศ', 'Foreign Language', 80),
      (
        'learning_area', 'student_development_activity', 'กิจกรรมพัฒนาผู้เรียน',
        'Student Development Activities', 90
      ),
      ('subject_type', 'basic', 'รายวิชาพื้นฐาน', 'Basic Subject', 10),
      ('subject_type', 'additional', 'รายวิชาเพิ่มเติม', 'Additional Subject', 20),
      ('subject_type', 'activity', 'กิจกรรม', 'Activity', 30)
  ) as preset(category, code, name, name_en, sort_order)
  on conflict do nothing;
$$;

select public.seed_subject_master_items(id) from public.schools;

-- Preserve any subjects already using the previous hardcoded codes as
-- non-system items too, in case a school's subjects reference a code that
-- somehow predates the seed above (defensive; codes already match 1:1).
insert into public.subject_master_items (school_id, category, code, name, sort_order)
select distinct school_id, 'learning_area', learning_area, learning_area, 999
from public.subjects
where learning_area is not null
on conflict do nothing;

insert into public.subject_master_items (school_id, category, code, name, sort_order)
select distinct school_id, 'subject_type', subject_type, subject_type, 999
from public.subjects
where subject_type is not null
on conflict do nothing;

create or replace function public.seed_subject_master_items_after_school_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_subject_master_items(new.id);
  return new;
end;
$$;

drop trigger if exists seed_subject_master_items_after_school_insert on public.schools;
create trigger seed_subject_master_items_after_school_insert
  after insert on public.schools
  for each row execute function public.seed_subject_master_items_after_school_insert();

revoke all on function public.seed_subject_master_items(uuid) from public;
revoke all on function public.seed_subject_master_items_after_school_insert() from public;
