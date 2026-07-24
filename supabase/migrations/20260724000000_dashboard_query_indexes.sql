-- Speed up the dashboard endpoints (student/teacher/admin): several columns are
-- filtered on directly but only sit as the trailing half of a composite unique
-- index or as a bare foreign key, neither of which the planner can use for a
-- single-column lookup.

create index if not exists idx_enrollments_classroom_id on public.enrollments (classroom_id);
create index if not exists idx_scores_student_id on public.scores (student_id);
create index if not exists idx_teacher_assignments_classroom_id on public.teacher_assignments (classroom_id);
create index if not exists idx_assignments_teacher_assignment_id on public.assignments (teacher_assignment_id);
create index if not exists idx_classrooms_school_id on public.classrooms (school_id);
create index if not exists idx_subjects_school_id on public.subjects (school_id);
create index if not exists idx_academic_years_school_id on public.academic_years (school_id);
create index if not exists idx_app_users_school_id_role on public.app_users (school_id, role);
