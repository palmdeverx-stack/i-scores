'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type AnnouncementType = 'general' | 'holiday' | 'exam';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export type TeacherAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  announcement_type: AnnouncementType;
  is_published: boolean;
  published_at: string;
  expires_at: string | null;
  event_start: string | null;
  event_end: string | null;
  created_at: string;
  targets: Array<{
    classroom_id: string;
    classroom: { id: string; name: string; grade_level: string | null } | null;
  }>;
};

export type TeacherClassroom = { id: string; name: string; grade_level: string | null };

export type AnnouncementPayload = {
  title: string;
  content: string;
  announcementType: AnnouncementType;
  priority: AnnouncementPriority;
  classroomIds: string[];
  eventStart: string;
  eventEnd: string;
  expiresAt: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function getTeacherAnnouncements(): Promise<{
  announcements: TeacherAnnouncement[];
  classrooms: TeacherClassroom[];
}> {
  const response = await fetch('/api/teacher/announcements', { headers: authHeader() });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถโหลดประกาศได้');
  return json;
}

export async function createTeacherAnnouncement(payload: AnnouncementPayload) {
  const response = await fetch('/api/teacher/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถสร้างประกาศได้');
  return json;
}

export async function updateTeacherAnnouncement(id: string, payload: AnnouncementPayload) {
  const response = await fetch(`/api/teacher/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถแก้ไขประกาศได้');
  return json;
}

export async function deleteTeacherAnnouncement(id: string) {
  const response = await fetch(`/api/teacher/announcements/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถลบประกาศได้');
}
