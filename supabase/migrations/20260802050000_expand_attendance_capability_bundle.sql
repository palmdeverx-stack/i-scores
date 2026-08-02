-- Attendance cannot operate from the three attendance screens alone. Include
-- the minimum school/classroom setup needed to create rosters and let assigned
-- teachers record attendance. Existing plans keep their snapshot until an
-- administrator explicitly accepts the newer bundle version.

update public.capability_bundles
set
  name = 'เช็กชื่อและเวลาเรียน',
  description = 'ตั้งค่าชั้นเรียนและรายชื่อ สแกน QR บันทึกเวลา และดูประวัติการเข้าเรียน',
  feature_keys = array[
    'admin.academic_years',
    'admin.classrooms',
    'admin.subjects',
    'admin.staff',
    'admin.students',
    'admin.teacher_assignments',
    'admin.enrollments',
    'teacher.assignments',
    'teacher.qr_attendance',
    'student.attendance',
    'student.qr'
  ]::text[],
  version = version + 1
where code = 'ATTENDANCE';
