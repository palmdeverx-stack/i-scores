-- Align subjects with the OBEC Basic Education Core Curriculum B.E. 2551:
-- 8 learning areas (+ student development activities), basic vs additional
-- subject type, and which grade levels (ป.1-ป.6, ม.1-ม.6) a subject is
-- offered to.
alter table public.subjects
  add column if not exists learning_area text,
  add column if not exists activity_type text,
  add column if not exists subject_type text,
  add column if not exists grade_levels text[] not null default '{}';

alter table public.subjects
  add constraint subjects_learning_area_check
    check (
      learning_area is null or learning_area in (
        'thai',
        'mathematics',
        'science_technology',
        'social_studies',
        'health_pe',
        'art',
        'occupations_technology',
        'foreign_language',
        'student_development_activity'
      )
    ),
  add constraint subjects_activity_type_check
    check (
      activity_type is null or activity_type in (
        'guidance',
        'scout_cadet',
        'club',
        'social_service'
      )
    ),
  add constraint subjects_activity_type_requires_area check (
    activity_type is null or learning_area = 'student_development_activity'
  ),
  add constraint subjects_subject_type_check
    check (subject_type is null or subject_type in ('basic', 'additional')),
  add constraint subjects_grade_levels_check
    check (
      grade_levels <@ array[
        'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
        'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'
      ]::text[]
    );

create index if not exists subjects_learning_area_idx on public.subjects (learning_area);
create index if not exists subjects_grade_levels_idx on public.subjects using gin (grade_levels);

comment on column public.subjects.learning_area is
  'OBEC 2551 core curriculum learning area (8 areas), or student_development_activity';
comment on column public.subjects.activity_type is
  'Student development activity subtype, only set when learning_area = student_development_activity';
comment on column public.subjects.subject_type is
  'basic (รายวิชาพื้นฐาน) or additional (รายวิชาเพิ่มเติม)';
comment on column public.subjects.grade_levels is
  'Grade levels this subject is offered to, e.g. {ป.1,ม.1}';
