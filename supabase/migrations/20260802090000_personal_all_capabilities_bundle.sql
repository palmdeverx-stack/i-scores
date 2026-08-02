-- Complete self-service package for an individual teacher. The owner creates
-- subjects, learning groups and learners without school-admin preparation.

insert into public.capability_bundles (
  code,
  name,
  description,
  target_scope,
  feature_keys,
  sort_order
)
values (
  'PERSONAL_ALL',
  'บุคคลครบทุกความสามารถ',
  'จัดการพื้นที่ส่วนตัวด้วยตนเอง ตั้งแต่วิชา กลุ่มและผู้เรียน ไปจนถึงงาน คะแนน ตารางสอน เช็กชื่อ ประกาศ และ Worksheet AI โดยไม่ต้องให้โรงเรียนสร้างข้อมูลให้',
  'individual',
  array[
    'teacher.manage_subjects',
    'teacher.manage_classrooms',
    'teacher.manage_enrollments',
    'teacher.assignments',
    'teacher.students',
    'teacher.qr_attendance',
    'teacher.timetable',
    'teacher.announcements',
    'teacher.worksheet_ai',
    'student.subjects',
    'student.assignments',
    'student.attendance',
    'student.qr'
  ]::text[],
  5
)
on conflict (lower(code)) do update
set
  name = excluded.name,
  description = excluded.description,
  target_scope = excluded.target_scope,
  feature_keys = excluded.feature_keys,
  version = public.capability_bundles.version + 1,
  is_active = true,
  sort_order = excluded.sort_order;

