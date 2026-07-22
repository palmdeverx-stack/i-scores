'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type StudentProfile = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  school: { id: string; name: string; code: string; logo_url: string | null } | null;
  enrollment: {
    id: string;
    student_number: string | null;
    classroom: {
      name: string;
      grade_level: string | null;
      academic_year: { year: string; start_date: string | null; end_date: string | null } | null;
    } | null;
  } | null;
};

export type UpdateStudentProfileParams = {
  firstName: string;
  lastName: string;
  email: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function getStudentProfile(): Promise<StudentProfile> {
  const response = await fetch('/api/student/profile', { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');

  return json.profile;
}

export async function updateStudentProfile(
  params: UpdateStudentProfileParams
): Promise<StudentProfile> {
  const response = await fetch('/api/student/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้');

  return json.profile;
}
