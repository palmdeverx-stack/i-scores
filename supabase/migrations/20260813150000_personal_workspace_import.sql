-- Lets a person who ends up with both a real school teacher account and an
-- auto-provisioned personal workspace (same contact email) selectively copy
-- classroom/subject/student data from the personal workspace into the real
-- school, instead of the two staying stranded forever.

alter table public.schools
  add column if not exists imported_at timestamptz,
  add column if not exists imported_into_school_id uuid references public.schools (id) on delete set null,
  add column if not exists import_dismissed_at timestamptz;

create or replace function public.import_personal_workspace_data(
  p_source_school_id uuid,
  p_target_school_id uuid,
  p_target_teacher_id uuid,
  p_include_students boolean default true
)
returns jsonb
language plpgsql
as $$
declare
  v_target_academic_year_id uuid;
  v_target_semester_id uuid;
  v_classroom record;
  v_new_classroom_id uuid;
  v_subject record;
  v_new_subject_id uuid;
  v_student record;
  v_new_student_id uuid;
  v_classroom_map jsonb := '{}'::jsonb;
  v_subject_map jsonb := '{}'::jsonb;
  v_student_map jsonb := '{}'::jsonb;
  v_classrooms_imported int := 0;
  v_subjects_imported int := 0;
  v_students_imported int := 0;
  v_enrollments_imported int := 0;
  v_assignments_imported int := 0;
begin
  if not exists (
    select 1 from public.schools
    where id = p_source_school_id and workspace_type = 'personal'
  ) then
    raise exception 'ไม่พบพื้นที่ส่วนตัวต้นทาง';
  end if;
  if not exists (
    select 1 from public.schools
    where id = p_target_school_id and workspace_type = 'school'
  ) then
    raise exception 'ไม่พบโรงเรียนปลายทาง';
  end if;
  if not exists (
    select 1 from public.app_users
    where id = p_target_teacher_id and school_id = p_target_school_id and role = 'teacher'
  ) then
    raise exception 'ไม่พบบัญชีครูปลายทาง';
  end if;

  -- Pick a semester that actually exists, preferring an active one under the
  -- most recently created academic year — an academic year can exist with no
  -- semesters set up yet, so "newest academic year" alone isn't enough.
  select s.id, s.academic_year_id
  into v_target_semester_id, v_target_academic_year_id
  from public.semesters s
  join public.academic_years ay on ay.id = s.academic_year_id
  where ay.school_id = p_target_school_id
  order by s.is_active desc, ay.is_active desc, ay.created_at desc, s.created_at desc
  limit 1;
  if v_target_semester_id is null then
    raise exception 'โรงเรียนปลายทางยังไม่มีภาคเรียน กรุณาสร้างปีการศึกษาและภาคเรียนก่อนนำเข้าข้อมูล';
  end if;

  -- Classrooms: dedupe by name within the target academic year.
  for v_classroom in
    select * from public.classrooms where school_id = p_source_school_id
  loop
    select id into v_new_classroom_id
    from public.classrooms
    where academic_year_id = v_target_academic_year_id and name = v_classroom.name;

    if v_new_classroom_id is null then
      insert into public.classrooms (school_id, academic_year_id, name, grade_level, name_en, grade_level_en)
      values (
        p_target_school_id, v_target_academic_year_id, v_classroom.name,
        v_classroom.grade_level, v_classroom.name_en, v_classroom.grade_level_en
      )
      returning id into v_new_classroom_id;
      v_classrooms_imported := v_classrooms_imported + 1;
    end if;
    v_classroom_map := v_classroom_map || jsonb_build_object(v_classroom.id::text, v_new_classroom_id::text);
  end loop;

  -- Subjects actually used by this workspace's teaching assignments (covers
  -- both school-scoped and personal-catalog subjects the teacher taught with).
  for v_subject in
    select distinct s.*
    from public.subjects s
    join public.teacher_assignments ta on ta.subject_id = s.id
    join public.classrooms c on c.id = ta.classroom_id
    where c.school_id = p_source_school_id
  loop
    select id into v_new_subject_id
    from public.subjects
    where school_id = p_target_school_id and name = v_subject.name;

    if v_new_subject_id is null then
      insert into public.subjects (
        school_id, academic_year_id, semester_id, code, name, name_en, credits,
        description, description_en, learning_area, activity_type, subject_type,
        grade_levels, study_hours, education_stage, status, scope
      )
      values (
        p_target_school_id, v_target_academic_year_id, v_target_semester_id,
        v_subject.code, v_subject.name, v_subject.name_en, v_subject.credits,
        v_subject.description, v_subject.description_en, v_subject.learning_area,
        v_subject.activity_type, v_subject.subject_type, v_subject.grade_levels,
        v_subject.study_hours, v_subject.education_stage, v_subject.status, 'school'
      )
      returning id into v_new_subject_id;
      v_subjects_imported := v_subjects_imported + 1;
    end if;
    v_subject_map := v_subject_map || jsonb_build_object(v_subject.id::text, v_new_subject_id::text);
  end loop;

  -- Teacher assignments: re-point to the target teacher and semester.
  insert into public.teacher_assignments (teacher_id, subject_id, classroom_id, semester_id)
  select distinct
    p_target_teacher_id,
    (v_subject_map ->> ta.subject_id::text)::uuid,
    (v_classroom_map ->> ta.classroom_id::text)::uuid,
    v_target_semester_id
  from public.teacher_assignments ta
  join public.classrooms c on c.id = ta.classroom_id
  where c.school_id = p_source_school_id
  on conflict (classroom_id, subject_id, semester_id) do nothing;
  get diagnostics v_assignments_imported = row_count;

  if p_include_students then
    -- Students are cloned as new accounts (never re-pointed) — usernames are
    -- globally unique, and national_id is dropped to avoid colliding with the
    -- same real ID already recorded elsewhere.
    for v_student in
      select distinct au.*
      from public.app_users au
      join public.enrollments e on e.student_id = au.id
      join public.classrooms c on c.id = e.classroom_id
      where c.school_id = p_source_school_id and au.role = 'student'
    loop
      insert into public.app_users (
        username, password_hash, email, first_name, last_name, role, school_id, is_active,
        name_prefix, first_name_en, last_name_en, nickname, gender, birth_date,
        nationality, ethnicity, religion, student_code
      )
      values (
        v_student.username || '_' || substr(md5(random()::text || v_student.id::text), 1, 6),
        v_student.password_hash, v_student.email, v_student.first_name, v_student.last_name,
        'student', p_target_school_id, true,
        v_student.name_prefix, v_student.first_name_en, v_student.last_name_en, v_student.nickname,
        v_student.gender, v_student.birth_date, v_student.nationality, v_student.ethnicity,
        v_student.religion, v_student.student_code
      )
      returning id into v_new_student_id;

      v_student_map := v_student_map || jsonb_build_object(v_student.id::text, v_new_student_id::text);
      v_students_imported := v_students_imported + 1;
    end loop;

    insert into public.enrollments (student_id, classroom_id, student_number)
    select
      (v_student_map ->> e.student_id::text)::uuid,
      (v_classroom_map ->> e.classroom_id::text)::uuid,
      e.student_number
    from public.enrollments e
    join public.classrooms c on c.id = e.classroom_id
    where c.school_id = p_source_school_id
      and v_student_map ? e.student_id::text
    on conflict (student_id, classroom_id) do nothing;
    get diagnostics v_enrollments_imported = row_count;
  end if;

  update public.schools
  set imported_at = now(), imported_into_school_id = p_target_school_id
  where id = p_source_school_id;

  return jsonb_build_object(
    'classrooms', v_classrooms_imported,
    'subjects', v_subjects_imported,
    'teacherAssignments', v_assignments_imported,
    'students', v_students_imported,
    'enrollments', v_enrollments_imported
  );
end;
$$;
