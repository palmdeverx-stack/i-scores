'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type Subject = {
  id: string;
  code: string | null;
  name: string;
  name_en: string | null;
  credits: number;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  academic_year_id: string | null;
  semester_id: string | null;
  academic_years: { year: string } | null;
  semesters: { name: string } | null;
  created_at: string;
};

export type SaveSubjectParams = {
  code?: string;
  name: string;
  nameEn?: string;
  credits: number;
  description?: string;
  descriptionEn?: string;
  academicYearId: string;
  semesterId: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function listSubjects(filters?: {
  academicYearId?: string;
  semesterId?: string;
}): Promise<Subject[]> {
  const params = new URLSearchParams();
  if (filters?.academicYearId) params.set('academicYearId', filters.academicYearId);
  if (filters?.semesterId) params.set('semesterId', filters.semesterId);
  const query = params.size ? `?${params.toString()}` : '';
  const response = await fetch(`/api/subjects${query}`, { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load subjects');

  return json.subjects;
}

export async function createSubject(params: SaveSubjectParams): Promise<Subject> {
  const response = await fetch('/api/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create subject');

  return json.subject;
}

export async function updateSubject(id: string, params: SaveSubjectParams): Promise<Subject> {
  const response = await fetch(`/api/subjects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update subject');

  return json.subject;
}

export async function uploadSubjectImage(id: string, file: File): Promise<Subject> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api/subjects/${id}/image`, {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to upload subject image');

  return json.subject;
}

export async function removeSubjectImage(id: string): Promise<Subject> {
  const response = await fetch(`/api/subjects/${id}/image`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to remove subject image');

  return json.subject;
}

export async function deleteSubject(id: string): Promise<void> {
  const response = await fetch(`/api/subjects/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to delete subject');
}
