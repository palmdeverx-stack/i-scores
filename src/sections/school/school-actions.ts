'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type School = {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  subscription: {
    plan_name: string;
    status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';
    ends_at: string | null;
  } | null;
  teacherCount: number;
  studentCount: number;
  classroomCount: number;
  subjectCount: number;
};

export type SchoolProfile = {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type CreateSchoolParams = {
  name: string;
  code: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function listSchools(): Promise<School[]> {
  const response = await fetch('/api/schools', { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load schools');

  return json.schools;
}

export async function createSchool(params: CreateSchoolParams) {
  const response = await fetch('/api/schools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create school');

  return json.school;
}

export async function toggleSchoolActive(id: string, isActive: boolean) {
  const response = await fetch(`/api/schools/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ isActive }),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update school');

  return json.school;
}

export async function getSchool(id: string): Promise<SchoolProfile> {
  const response = await fetch(`/api/schools/${id}`, { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load school');

  return json.school;
}

export async function updateSchool(
  id: string,
  params: { name?: string; code?: string }
): Promise<SchoolProfile> {
  const response = await fetch(`/api/schools/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update school');

  return json.school;
}

export async function deleteSchool(id: string): Promise<void> {
  const response = await fetch(`/api/schools/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to delete school');
}

export async function uploadSchoolLogo(id: string, file: File): Promise<SchoolProfile> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/schools/${id}/logo`, {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to upload logo');

  return json.school;
}
