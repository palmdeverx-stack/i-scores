'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type Classroom = {
  id: string;
  name: string;
  grade_level: string | null;
  academic_year_id: string;
  academic_years: { year: string } | null;
  homeroom_teachers: ClassroomTeacher[];
  created_at: string;
};

export type ClassroomTeacher = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
};

export type CreateClassroomParams = {
  name: string;
  gradeLevel?: string;
  academicYearId: string;
  teacherIds?: string[];
  subjectId?: string;
  semesterId?: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function listClassrooms(): Promise<Classroom[]> {
  const response = await fetch('/api/classrooms', { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load classrooms');

  return json.classrooms;
}

export async function createClassroom(params: CreateClassroomParams) {
  const response = await fetch('/api/classrooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create classroom');

  return json.classroom;
}

export async function updateClassroom(id: string, params: CreateClassroomParams) {
  const response = await fetch(`/api/classrooms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to update classroom');

  return json.classroom;
}

export async function deleteClassroom(id: string): Promise<void> {
  const response = await fetch(`/api/classrooms/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to delete classroom');
}
