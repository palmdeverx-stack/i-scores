'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type Assignment = {
  id: string;
  title: string;
  description: string | null;
  full_score: number;
  due_at: string | null;
  created_at: string;
  attachments: Array<{
    id: string;
    file_name: string;
    file_url: string;
    mime_type: string;
    file_size: number;
    created_at: string;
  }>;
};

export type CreateAssignmentParams = {
  title: string;
  description?: string;
  fullScore?: number;
  dueAt?: string | null;
  files?: File[];
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
  const formData = new FormData();
  formData.append('title', params.title);
  formData.append('description', params.description ?? '');
  formData.append('fullScore', String(params.fullScore ?? 100));
  formData.append('dueAt', params.dueAt ?? '');
  params.files?.forEach((file) => formData.append('files', file));

  const response = await fetch(`/api/teacher-assignments/${teacherAssignmentId}/assignments`, {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create assignment');

  return json.assignment;
}
