-- ช่วงชั้น (education stage: primary / lower secondary / upper secondary) —
-- the missing piece to reconstruct the OBEC subject code convention
-- (e.g. ว21102 = learning area + stage + grade year + subject type + running
-- number). Added as a new subject_master_items category, school-managed like
-- learning_area / subject_type, plus a subjects.education_stage column that
-- stores the item's stable code.

alter table public.subject_master_items
  drop constraint if exists subject_master_items_category_check;

alter table public.subject_master_items
  add constraint subject_master_items_category_check
    check (category in ('learning_area', 'subject_type', 'education_stage'));

alter table public.subjects
  add column if not exists education_stage text;

create index if not exists subjects_education_stage_idx
  on public.subjects (education_stage);

comment on column public.subjects.education_stage is
  'ช่วงชั้น (education stage) — references subject_master_items.code where category = education_stage';

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
      ('subject_type', 'activity', 'กิจกรรม', 'Activity', 30),
      ('education_stage', 'primary', 'ประถมศึกษา', 'Primary Education', 10),
      (
        'education_stage', 'lower_secondary', 'มัธยมศึกษาตอนต้น',
        'Lower Secondary Education', 20
      ),
      (
        'education_stage', 'upper_secondary', 'มัธยมศึกษาตอนปลาย',
        'Upper Secondary Education', 30
      )
  ) as preset(category, code, name, name_en, sort_order)
  on conflict do nothing;
$$;

insert into public.subject_master_items (
  school_id, category, code, name, name_en, sort_order, is_system
)
select id, 'education_stage', 'primary', 'ประถมศึกษา', 'Primary Education', 10, true
from public.schools
on conflict do nothing;

insert into public.subject_master_items (
  school_id, category, code, name, name_en, sort_order, is_system
)
select
  id, 'education_stage', 'lower_secondary', 'มัธยมศึกษาตอนต้น',
  'Lower Secondary Education', 20, true
from public.schools
on conflict do nothing;

insert into public.subject_master_items (
  school_id, category, code, name, name_en, sort_order, is_system
)
select
  id, 'education_stage', 'upper_secondary', 'มัธยมศึกษาตอนปลาย',
  'Upper Secondary Education', 30, true
from public.schools
on conflict do nothing;
