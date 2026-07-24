'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type TeacherProfile = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  avatar_url: string | null;
  created_at: string;
  school: { id: string; name: string; code: string; logo_url: string | null } | null;
  summary: { assignments: number; subjects: number; classrooms: number };
  teaching_assignments: {
    id: string;
    subject: { id: string; code: string | null; name: string } | null;
    classroom: { id: string; name: string } | null;
    semester: { id: string; name: string; is_active: boolean } | null;
  }[];
};

export type UpdateTeacherProfileParams = {
  firstName: string;
  lastName: string;
  firstNameEn: string;
  lastNameEn: string;
  email: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function getTeacherProfile(): Promise<TeacherProfile> {
  const response = await fetch('/api/teacher/profile', { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');

  return json.profile;
}

export async function updateTeacherProfile(
  params: UpdateTeacherProfileParams
): Promise<TeacherProfile> {
  const response = await fetch('/api/teacher/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้');

  return json.profile;
}

export async function uploadTeacherAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/teacher/profile/avatar', {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้');
  return json.avatarUrl;
}

export async function deleteTeacherAvatar(): Promise<void> {
  const response = await fetch('/api/teacher/profile/avatar', {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลบรูปโปรไฟล์ได้');
}
