'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type Assignment = {
  id: string;
  title: string;
  description: string | null;
  full_score: number;
  created_at: string;
};

export type CreateAssignmentParams = {
  title: string;
  description?: string;
  fullScore?: number;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function listAssignments(teacherAssignmentId: string): Promise<Assignment[]> {
  const response = await fetch(`/api/teacher-assignments/${teacherAssignmentId}/assignments`, {
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load assignments');

  return json.assignments;
}

export async function createAssignment(
  teacherAssignmentId: string,
  params: CreateAssignmentParams
): Promise<Assignment> {
  const response = await fetch(`/api/teacher-assignments/${teacherAssignmentId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create assignment');

  return json.assignment;
}
