-- One classification source for school and personal workspaces.
-- Grade levels and activity types become master data and may reference a parent code.

alter table public.subject_master_items
  alter column school_id drop not null,
  add column if not exists parent_code text;

alter table public.subject_master_items
  drop constraint if exists subject_master_items_category_check,
  add constraint subject_master_items_category_check check (
    category in (
      'learning_area', 'subject_type', 'education_stage', 'grade_level', 'activity_type'
    )
  );

create unique index if not exists subject_master_items_global_category_code_key
  on public.subject_master_items (category, code)
  where school_id is null;

insert into public.subject_master_items (
  school_id, category, code, name, name_en, parent_code, sort_order, is_system
)
select null, preset.category, preset.code, preset.name, preset.name_en,
  preset.parent_code, preset.sort_order, true
from (
  values
    ('learning_area', 'thai', 'ภาษาไทย', 'Thai Language', null, 10),
    ('learning_area', 'mathematics', 'คณิตศาสตร์', 'Mathematics', null, 20),
    ('learning_area', 'science_technology', 'วิทยาศาสตร์และเทคโนโลยี', 'Science and Technology', null, 30),
    ('learning_area', 'social_studies', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'Social Studies, Religion and Culture', null, 40),
    ('learning_area', 'health_pe', 'สุขศึกษาและพลศึกษา', 'Health and Physical Education', null, 50),
    ('learning_area', 'art', 'ศิลปะ', 'Art', null, 60),
    ('learning_area', 'occupations_technology', 'การงานอาชีพ', 'Occupations and Technology', null, 70),
    ('learning_area', 'foreign_language', 'ภาษาต่างประเทศ', 'Foreign Language', null, 80),
    ('learning_area', 'student_development_activity', 'กิจกรรมพัฒนาผู้เรียน', 'Student Development Activities', null, 90),
    ('subject_type', 'basic', 'รายวิชาพื้นฐาน', 'Basic Subject', null, 10),
    ('subject_type', 'additional', 'รายวิชาเพิ่มเติม', 'Additional Subject', null, 20),
    ('subject_type', 'activity', 'กิจกรรม', 'Activity', null, 30),
    ('education_stage', 'primary', 'ประถมศึกษา', 'Primary Education', null, 10),
    ('education_stage', 'lower_secondary', 'มัธยมศึกษาตอนต้น', 'Lower Secondary Education', null, 20),
    ('education_stage', 'upper_secondary', 'มัธยมศึกษาตอนปลาย', 'Upper Secondary Education', null, 30),
    ('grade_level', 'ป.1', 'ประถมศึกษาปีที่ 1', 'Grade 1', 'primary', 10),
    ('grade_level', 'ป.2', 'ประถมศึกษาปีที่ 2', 'Grade 2', 'primary', 20),
    ('grade_level', 'ป.3', 'ประถมศึกษาปีที่ 3', 'Grade 3', 'primary', 30),
    ('grade_level', 'ป.4', 'ประถมศึกษาปีที่ 4', 'Grade 4', 'primary', 40),
    ('grade_level', 'ป.5', 'ประถมศึกษาปีที่ 5', 'Grade 5', 'primary', 50),
    ('grade_level', 'ป.6', 'ประถมศึกษาปีที่ 6', 'Grade 6', 'primary', 60),
    ('grade_level', 'ม.1', 'มัธยมศึกษาปีที่ 1', 'Grade 7', 'lower_secondary', 70),
    ('grade_level', 'ม.2', 'มัธยมศึกษาปีที่ 2', 'Grade 8', 'lower_secondary', 80),
    ('grade_level', 'ม.3', 'มัธยมศึกษาปีที่ 3', 'Grade 9', 'lower_secondary', 90),
    ('grade_level', 'ม.4', 'มัธยมศึกษาปีที่ 4', 'Grade 10', 'upper_secondary', 100),
    ('grade_level', 'ม.5', 'มัธยมศึกษาปีที่ 5', 'Grade 11', 'upper_secondary', 110),
    ('grade_level', 'ม.6', 'มัธยมศึกษาปีที่ 6', 'Grade 12', 'upper_secondary', 120),
    ('activity_type', 'guidance', 'กิจกรรมแนะแนว', 'Guidance', 'student_development_activity', 10),
    ('activity_type', 'scout_cadet', 'ลูกเสือ/เนตรนารี หรือ นศท.', 'Scout or Cadet', 'student_development_activity', 20),
    ('activity_type', 'club', 'ชุมนุม', 'Club', 'student_development_activity', 30),
    ('activity_type', 'social_service', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'Social Service', 'student_development_activity', 40)
) as preset(category, code, name, name_en, parent_code, sort_order)
on conflict do nothing;

insert into public.subject_master_items (
  school_id, category, code, name, name_en, parent_code, sort_order, is_system
)
select school.id, preset.category, preset.code, preset.name, preset.name_en,
  preset.parent_code, preset.sort_order, true
from public.schools school
cross join (
  values
    ('grade_level', 'ป.1', 'ประถมศึกษาปีที่ 1', 'Grade 1', 'primary', 10),
    ('grade_level', 'ป.2', 'ประถมศึกษาปีที่ 2', 'Grade 2', 'primary', 20),
    ('grade_level', 'ป.3', 'ประถมศึกษาปีที่ 3', 'Grade 3', 'primary', 30),
    ('grade_level', 'ป.4', 'ประถมศึกษาปีที่ 4', 'Grade 4', 'primary', 40),
    ('grade_level', 'ป.5', 'ประถมศึกษาปีที่ 5', 'Grade 5', 'primary', 50),
    ('grade_level', 'ป.6', 'ประถมศึกษาปีที่ 6', 'Grade 6', 'primary', 60),
    ('grade_level', 'ม.1', 'มัธยมศึกษาปีที่ 1', 'Grade 7', 'lower_secondary', 70),
    ('grade_level', 'ม.2', 'มัธยมศึกษาปีที่ 2', 'Grade 8', 'lower_secondary', 80),
    ('grade_level', 'ม.3', 'มัธยมศึกษาปีที่ 3', 'Grade 9', 'lower_secondary', 90),
    ('grade_level', 'ม.4', 'มัธยมศึกษาปีที่ 4', 'Grade 10', 'upper_secondary', 100),
    ('grade_level', 'ม.5', 'มัธยมศึกษาปีที่ 5', 'Grade 11', 'upper_secondary', 110),
    ('grade_level', 'ม.6', 'มัธยมศึกษาปีที่ 6', 'Grade 12', 'upper_secondary', 120),
    ('activity_type', 'guidance', 'กิจกรรมแนะแนว', 'Guidance', 'student_development_activity', 10),
    ('activity_type', 'scout_cadet', 'ลูกเสือ/เนตรนารี หรือ นศท.', 'Scout or Cadet', 'student_development_activity', 20),
    ('activity_type', 'club', 'ชุมนุม', 'Club', 'student_development_activity', 30),
    ('activity_type', 'social_service', 'กิจกรรมเพื่อสังคมและสาธารณประโยชน์', 'Social Service', 'student_development_activity', 40)
) as preset(category, code, name, name_en, parent_code, sort_order)
on conflict do nothing;

comment on column public.subject_master_items.parent_code is
  'Parent master code, e.g. grade_level -> education_stage.';

create or replace function public.seed_subject_hierarchy_master_items_after_school_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subject_master_items (
    school_id, category, code, name, name_en, parent_code, sort_order, is_system
  )
  select new.id, category, code, name, name_en, parent_code, sort_order, true
  from public.subject_master_items
  where school_id is null and category in ('grade_level', 'activity_type')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists seed_subject_hierarchy_master_items_after_school_insert on public.schools;
create trigger seed_subject_hierarchy_master_items_after_school_insert
  after insert on public.schools
  for each row execute function public.seed_subject_hierarchy_master_items_after_school_insert();

revoke all on function public.seed_subject_hierarchy_master_items_after_school_insert() from public;
