// Catalog of pages/features a department can be granted access to, and then
// delegate to individual members. Add new entries here as more pages gain
// department-level delegation — no schema change needed.

export const DEPARTMENT_PERMISSIONS = [
  {
    key: 'schedule.manage',
    label: 'จัดตารางสอน',
    description: 'จัดตารางสอนของครูทุกคนในโรงเรียน ผูกครูเข้ากับวิชา และจัดคาบสอนรายห้อง',
  },
  {
    key: 'academic_years.manage',
    label: 'ปีการศึกษา',
    description: 'สร้าง แก้ไข และเปิด/ปิดใช้งานปีการศึกษาและภาคเรียนของทั้งโรงเรียน',
  },
  {
    key: 'classrooms.manage',
    label: 'ห้องเรียน',
    description: 'สร้างและแก้ไขห้องเรียนทั้งโรงเรียน',
  },
  {
    key: 'subjects.manage',
    label: 'รายวิชา',
    description: 'สร้างและแก้ไขรายวิชาทั้งโรงเรียน',
  },
  {
    key: 'enrollments.manage',
    label: 'ลงทะเบียนนักเรียน',
    description: 'จัดนักเรียนเข้าห้องเรียนทั้งโรงเรียน',
  },
  {
    key: 'announcements.manage',
    label: 'ประกาศ',
    description: 'สร้างและจัดการประกาศของทั้งโรงเรียน',
  },
  {
    key: 'students.manage',
    label: 'นักเรียน',
    description: 'สร้าง แก้ไข และเปิด/ปิดบัญชีนักเรียนทั้งโรงเรียน',
  },
  {
    key: 'staff.manage',
    label: 'บุคลากร',
    description:
      'สร้าง แก้ไข และเปิด/ปิดบัญชีครู/บุคลากรทั้งโรงเรียน รวมถึงดูรหัสผ่านที่ถอดรหัสแล้ว — สิทธิ์นี้ให้ระดับเดียวกับผู้ดูแลโรงเรียน',
  },
] as const;

export type DepartmentPermissionKey = (typeof DEPARTMENT_PERMISSIONS)[number]['key'];

export const DEPARTMENT_PERMISSION_KEYS = DEPARTMENT_PERMISSIONS.map((item) => item.key);

export function isDepartmentPermissionKey(value: string): value is DepartmentPermissionKey {
  return (DEPARTMENT_PERMISSION_KEYS as string[]).includes(value);
}
