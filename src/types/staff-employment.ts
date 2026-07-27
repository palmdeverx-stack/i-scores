export const STAFF_TYPES = [
  { value: 'executive', label: 'ผู้บริหาร' },
  { value: 'teacher', label: 'ครูผู้สอน' },
  { value: 'contract_teacher', label: 'ครูอัตราจ้าง' },
  { value: 'government_employee', label: 'พนักงานราชการ' },
  { value: 'administrative_officer', label: 'เจ้าหน้าที่ธุรการ' },
  { value: 'janitor', label: 'นักการภารโรง' },
] as const;

export const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'ปฏิบัติงาน' },
  { value: 'study_leave', label: 'ลาศึกษาต่อ' },
  { value: 'leave', label: 'ลาพัก' },
  { value: 'retired', label: 'เกษียณ' },
  { value: 'terminated', label: 'พ้นสภาพ' },
] as const;

// Schools may add custom staff types. The constants above are the built-in
// types with special defaults (for example the executive approval workspace).
export type StaffType = string;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]['value'];

export function isStaffType(value: unknown): value is StaffType {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isEmploymentStatus(value: unknown): value is EmploymentStatus {
  return EMPLOYMENT_STATUSES.some((option) => option.value === value);
}
