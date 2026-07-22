-- Only one teacher may teach a given subject in a given classroom per semester
-- (previously the unique constraint only stopped the same teacher being
-- assigned twice, not a second, different teacher).

alter table public.teacher_assignments
  drop constraint teacher_assignments_teacher_id_subject_id_classroom_id_seme_key;

alter table public.teacher_assignments
  add constraint teacher_assignments_classroom_subject_semester_key
  unique (classroom_id, subject_id, semester_id);
