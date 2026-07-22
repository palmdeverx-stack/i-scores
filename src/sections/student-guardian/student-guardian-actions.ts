'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type StudentGuardian = {
  id: string;
  student_id: string;
  full_name: string;
  relationship: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  address: string | null;
  notes: string | null;
  is_primary: boolean;
};

export type GuardianInput = {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  occupation: string;
  address: string;
  notes: string;
  isPrimary: boolean;
};

const authHeader = () => ({ Authorization: `Bearer ${getStoredToken()}` });
const baseUrl = (assignmentId: string | null, studentId: string) =>
  assignmentId
    ? `/api/teacher-assignments/${assignmentId}/students/${studentId}/guardians`
    : `/api/admin/students/${studentId}/guardians`;

export async function listStudentGuardians(assignmentId: string | null, studentId: string) {
  const response = await fetch(baseUrl(assignmentId, studentId), { headers: authHeader() });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดข้อมูลผู้ปกครองได้');
  return json.guardians as StudentGuardian[];
}

export async function createStudentGuardian(
  assignmentId: string | null,
  studentId: string,
  input: GuardianInput
) {
  const response = await fetch(baseUrl(assignmentId, studentId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถเพิ่มข้อมูลผู้ปกครองได้');
  return json.guardian as StudentGuardian;
}

export async function updateStudentGuardian(
  assignmentId: string | null,
  studentId: string,
  guardianId: string,
  input: GuardianInput
) {
  const response = await fetch(`${baseUrl(assignmentId, studentId)}/${guardianId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(input),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถแก้ไขข้อมูลผู้ปกครองได้');
  return json.guardian as StudentGuardian;
}

export async function deleteStudentGuardian(
  assignmentId: string | null,
  studentId: string,
  guardianId: string
) {
  const response = await fetch(`${baseUrl(assignmentId, studentId)}/${guardianId}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลบข้อมูลผู้ปกครองได้');
}
