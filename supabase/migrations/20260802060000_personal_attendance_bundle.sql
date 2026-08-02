-- Individual attendance is a teacher-owned personal workspace. The buyer sees
-- groups and learners; the internal tenant remains isolated by school_id.

insert into public.capability_bundles (
  code,
  name,
  description,
  target_scope,
  feature_keys,
  sort_order
)
values (
  'PERSONAL_ATTENDANCE',
  'เช็กชื่อส่วนตัว',
  'สร้างกลุ่มและรายชื่อ สแกน QR บันทึกเวลา และให้ผู้เรียนดูประวัติ โดยไม่ต้องตั้งค่าโรงเรียน',
  'individual',
  array[
    'teacher.students',
    'teacher.manage_subjects',
    'teacher.manage_classrooms',
    'teacher.manage_enrollments',
    'teacher.qr_attendance',
    'student.qr',
    'student.attendance'
  ]::text[],
  25
)
on conflict do nothing;

insert into public.ekru_apps (
  code,
  name,
  launch_path,
  required_feature_key,
  supported_scope,
  is_active
)
values (
  'PERSONAL_ATTENDANCE',
  'E-KRU Personal Attendance',
  '/apps/personal-attendance',
  'teacher.qr_attendance',
  'school',
  true
)
on conflict (code) do update
set
  name = excluded.name,
  launch_path = excluded.launch_path,
  required_feature_key = excluded.required_feature_key,
  supported_scope = excluded.supported_scope,
  is_active = excluded.is_active;
