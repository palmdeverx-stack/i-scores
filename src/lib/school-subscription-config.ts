export const SCHOOL_FEATURES = [
  {
    key: 'admin.school_profile',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'ข้อมูลโรงเรียน',
    description: 'ดูและแก้ไขข้อมูล โลโก้ และที่อยู่โรงเรียน',
  },
  {
    key: 'admin.academic_years',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'ปีการศึกษาและภาคเรียน',
    description: 'จัดการปีการศึกษาและภาคเรียน',
  },
  {
    key: 'admin.classrooms',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'ห้องเรียน',
    description: 'สร้างและจัดการห้องเรียน',
  },
  {
    key: 'admin.subjects',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'รายวิชา',
    description: 'สร้างและจัดการรายวิชา',
  },
  {
    key: 'admin.staff',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'ครูและบุคลากร',
    description: 'สร้าง แก้ไข เปิด/ปิดบัญชีครู',
  },
  {
    key: 'admin.students',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'นักเรียน',
    description: 'สร้าง แก้ไข และจัดการสถานะนักเรียน',
  },
  {
    key: 'admin.teacher_assignments',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'ครูประจำวิชา',
    description: 'มอบหมายครูให้วิชาและห้องเรียน',
  },
  {
    key: 'admin.enrollments',
    group: 'ผู้ดูแลโรงเรียน',
    label: 'ลงทะเบียนนักเรียน',
    description: 'เพิ่ม ย้าย และเลื่อนชั้นนักเรียน',
  },
  {
    key: 'teacher.assignments',
    group: 'ครู',
    label: 'วิชาที่สอน งาน และคะแนน',
    description: 'จัดการรายวิชา งาน คะแนน และเช็คชื่อรายวิชา',
  },
  {
    key: 'teacher.students',
    group: 'ครู',
    label: 'นักเรียนของฉัน',
    description: 'ดูและจัดการนักเรียนในชั้นประจำ',
  },
  {
    key: 'teacher.qr_attendance',
    group: 'ครู',
    label: 'QR เช็คชื่อ',
    description: 'สแกน QR เข้าแถวและเข้าเรียนรายคาบ',
  },
  {
    key: 'teacher.timetable',
    group: 'ครู',
    label: 'ตารางสอน',
    description: 'ดูและจัดการตารางสอน',
  },
  {
    key: 'teacher.announcements',
    group: 'ครู',
    label: 'ประกาศ',
    description: 'สร้างและจัดการประกาศ',
  },
  {
    key: 'teacher.manage_subjects',
    group: 'ครู',
    label: 'ครูสร้างรายวิชา',
    description: 'อนุญาตให้ครูสร้างรายวิชาในปีการศึกษาและภาคเรียนของโรงเรียน',
  },
  {
    key: 'teacher.manage_classrooms',
    group: 'ครู',
    label: 'ครูสร้างห้องเรียน',
    description: 'อนุญาตให้ครูสร้างห้องเรียน',
  },
  {
    key: 'teacher.manage_enrollments',
    group: 'ครู',
    label: 'ครูเพิ่มนักเรียน',
    description: 'อนุญาตให้ครูสร้างบัญชีนักเรียนและเพิ่มเข้าห้อง',
  },
  {
    key: 'student.subjects',
    group: 'นักเรียน',
    label: 'วิชาเรียน',
    description: 'ดูวิชาและรายละเอียดห้องเรียน',
  },
  {
    key: 'student.assignments',
    group: 'นักเรียน',
    label: 'งานที่ต้องส่ง',
    description: 'ดูงานและผลคะแนน',
  },
  {
    key: 'student.attendance',
    group: 'นักเรียน',
    label: 'ประวัติการเข้าเรียน',
    description: 'ดูประวัติการเข้าเรียนของตนเอง',
  },
  {
    key: 'student.qr',
    group: 'นักเรียน',
    label: 'QR ของฉัน',
    description: 'แสดง QR ประจำตัวสำหรับเช็คชื่อ',
  },
] as const;

export type SchoolFeatureKey = (typeof SCHOOL_FEATURES)[number]['key'];

export const ALL_SCHOOL_FEATURE_KEYS = SCHOOL_FEATURES.map(
  (feature) => feature.key
) as SchoolFeatureKey[];

export const STARTER_FEATURE_KEYS: SchoolFeatureKey[] = ALL_SCHOOL_FEATURE_KEYS.filter(
  (key) =>
    ![
      'teacher.qr_attendance',
      'teacher.manage_subjects',
      'teacher.manage_classrooms',
      'teacher.manage_enrollments',
      'student.qr',
    ].includes(key)
);

export const SUBSCRIPTION_STATUS_LABEL = {
  trialing: 'ทดลองใช้',
  active: 'ใช้งาน',
  past_due: 'ค้างชำระ',
  suspended: 'ระงับ',
  canceled: 'ยกเลิก',
} as const;
