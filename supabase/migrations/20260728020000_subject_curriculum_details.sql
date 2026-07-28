-- Curriculum details used by course structures and curriculum documents.
alter table public.subjects
  add column if not exists study_hours numeric(7, 2) not null default 0,
  add column if not exists learning_standards text[] not null default '{}',
  add column if not exists learning_outcomes text[] not null default '{}',
  add column if not exists learning_units text[] not null default '{}',
  add column if not exists indicators text[] not null default '{}';

alter table public.subjects
  drop constraint if exists subjects_study_hours_check;

alter table public.subjects
  add constraint subjects_study_hours_check check (study_hours >= 0);

comment on column public.subjects.study_hours is 'Total instructional hours for the subject';
comment on column public.subjects.learning_standards is 'Curriculum learning standards';
comment on column public.subjects.learning_outcomes is 'Expected learning outcomes';
comment on column public.subjects.learning_units is 'Learning unit names or summaries';
comment on column public.subjects.indicators is 'Curriculum indicators';

insert into public.subject_master_items (
  school_id, category, code, name, name_en, sort_order, is_system
)
select id, 'subject_type', 'activity', 'กิจกรรม', 'Activity', 30, true
from public.schools
on conflict do nothing;
