'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type AcademicYear = {
  id: string;
  year: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export type Semester = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const response = await fetch('/api/academic-years', { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load academic years');

  return json.academicYears;
}

export type SaveAcademicYearParams = {
  year: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
};

export async function createAcademicYear(params: SaveAcademicYearParams): Promise<AcademicYear> {
  const response = await fetch('/api/academic-years', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create academic year');

  return json.academicYear;
}

export async function updateAcademicYear(
  id: string,
  params: SaveAcademicYearParams
): Promise<AcademicYear> {
  const response = await fetch(`/api/academic-years/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update academic year');

  return json.academicYear;
}

export async function deleteAcademicYear(id: string): Promise<void> {
  const response = await fetch(`/api/academic-years/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to delete academic year');
}

export async function listSemesters(academicYearId: string): Promise<Semester[]> {
  const response = await fetch(`/api/semesters?academicYearId=${academicYearId}`, {
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load semesters');

  return json.semesters;
}

export type SaveSemesterParams = {
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
};

export async function createSemester(params: SaveSemesterParams): Promise<Semester> {
  const response = await fetch('/api/semesters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create semester');

  return json.semester;
}

export async function updateSemester(
  id: string,
  params: Omit<SaveSemesterParams, 'academicYearId'>
): Promise<Semester> {
  const response = await fetch(`/api/semesters/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update semester');

  return json.semester;
}

export async function deleteSemester(id: string): Promise<void> {
  const response = await fetch(`/api/semesters/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to delete semester');
}
