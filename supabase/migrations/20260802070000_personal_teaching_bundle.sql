-- Personal teaching shares the same isolated tenant as personal attendance.
-- Licenses stay separate for billing/lifecycle, while effective entitlements are
-- unioned by school_id so overlapping menus and academic data appear only once.

insert into public.capability_bundles (
  code,
  name,
  description,
  target_scope,
  feature_keys,
  sort_order
)
values (
  'PERSONAL_TEACHING',
  'การสอน งาน และคะแนนส่วนตัว',
  'สร้างวิชาและกลุ่มผู้เรียน มอบหมายงาน บันทึกคะแนน และดูตารางสอน โดยใช้ข้อมูลร่วมกับชุดเช็กชื่อส่วนตัว',
  'individual',
  array[
    'teacher.students',
    'teacher.manage_subjects',
    'teacher.manage_classrooms',
    'teacher.manage_enrollments',
    'teacher.assignments',
    'teacher.timetable',
    'student.subjects',
    'student.assignments'
  ]::text[],
  26
)
on conflict do nothing;

comment on table public.capability_bundles is
  'Reusable, versioned feature presets. Individual teacher bundles share one personal workspace; enabled features are unioned from active licenses.';
