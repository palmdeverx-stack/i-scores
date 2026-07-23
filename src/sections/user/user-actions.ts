'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type UserRole = 'master_admin' | 'school_admin' | 'teacher' | 'student';

export type StudentStatus = 'studying' | 'graduated' | 'transferred' | 'withdrawn' | 'dismissed';

export type UserRow = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  school_id: string | null;
  school: { name: string } | null;
  created_at: string;
  must_change_password?: boolean;
  login_password?: string | null;
  student_status?: StudentStatus | null;
  student_code?: string | null;
  national_id?: string | null;
  name_prefix?: string | null;
  first_name_en?: string | null;
  last_name_en?: string | null;
  nickname?: string | null;
  gender?: 'male' | 'female' | 'other' | 'unspecified' | null;
  birth_date?: string | null;
  nationality?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  is_active?: boolean;
};

export type CreateUserParams = {
  username: string;
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId?: string;
  studentCode?: string;
  nationalId?: string;
  namePrefix?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  nickname?: string;
  gender?: 'male' | 'female' | 'other' | 'unspecified';
  birthDate?: string;
  nationality?: string;
  ethnicity?: string;
  religion?: string;
};

export type UpdateStudentProfileParams = Omit<CreateUserParams, 'role' | 'schoolId'>;

export type UpdateSchoolAdminParams = {
  username: string;
  email?: string;
  password?: string;
  firstName: string;
  lastName: string;
  schoolId: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

/** **************************************
 * List users — school admin sees their own school, master admin sees
 * school admins (or pass `role` to filter, e.g. for select dropdowns)
 *************************************** */
export async function listUsers(role?: UserRole): Promise<UserRow[]> {
  const url = role ? `/api/admin/users?role=${role}` : '/api/admin/users';
  const response = await fetch(url, { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Failed to load users');
  }

  return json.users;
}

/** **************************************
 * Create user
 *************************************** */
export async function createUser(params: CreateUserParams) {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? 'Failed to create user');
  }

  return json.user;
}

export async function updateSchoolAdmin(id: string, params: UpdateSchoolAdminParams) {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update school admin');
  return json.user;
}

export async function deleteSchoolAdmin(id: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to delete school admin');
}

export async function updateStudentProfile(id: string, params: UpdateStudentProfileParams) {
  const response = await fetch(`/api/admin/students/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update student');
  return json.student as UserRow;
}

export async function uploadStudentAvatar(studentId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/admin/students/${studentId}/avatar`, {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถอัปโหลดรูปนักเรียนได้');
  return json.avatarUrl;
}

export async function deleteStudentAvatar(studentId: string): Promise<void> {
  const response = await fetch(`/api/admin/students/${studentId}/avatar`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลบรูปนักเรียนได้');
}

export async function updateStudentStatus(
  studentId: string,
  status: StudentStatus
): Promise<StudentStatus> {
  const response = await fetch(`/api/admin/students/${studentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ status }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถเปลี่ยนสถานะนักเรียนได้');
  return json.student.student_status;
}

export async function updateUserActive(id: string, isActive: boolean): Promise<boolean> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ isActive }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถเปลี่ยนสถานะบัญชีได้');
  return json.user.is_active;
}

export async function deleteManagedUser(id: string): Promise<void> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลบบัญชีได้');
}

export async function updateStaffUser(
  id: string,
  params: Omit<CreateUserParams, 'role' | 'schoolId'>
) {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถแก้ไขบัญชีได้');
  return json.user as UserRow;
}
