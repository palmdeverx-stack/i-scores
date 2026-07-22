'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type Enrollment = {
  id: string;
  student_number: string | null;
  created_at: string;
  student: { id: string; username: string; first_name: string | null; last_name: string | null };
  classroom: {
    id: string;
    name: string;
    academic_year_id: string;
    academic_years: { year: string } | null;
  };
};

export type CreateEnrollmentParams = {
  studentId: string;
  classroomId: string;
  studentNumber?: string;
};

export type ProgressStatus =
  | 'submitted'
  | 'late'
  | 'not_submitted'
  | 'absent'
  | 'sick_leave'
  | 'pending_review';

export type EnrollmentProgress = {
  enrollment: {
    id: string;
    student_number: string | null;
    student: Enrollment['student'];
    classroom: { id: string; name: string; academic_years: { year: string } | null };
  };
  subjects: Array<{
    id: string;
    teacher: { id: string; username: string; first_name: string | null; last_name: string | null };
    subject: {
      id: string;
      code: string | null;
      name: string;
      credits: number;
      image_url: string | null;
    };
    semester: { id: string; name: string };
    assignments: Array<{
      id: string;
      title: string;
      description: string | null;
      full_score: number;
      created_at: string;
      score: number | null;
      feedback: string | null;
      status: ProgressStatus;
    }>;
  }>;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function listEnrollments(params?: {
  classroomId?: string;
  studentId?: string;
}): Promise<Enrollment[]> {
  const query = new URLSearchParams();
  if (params?.classroomId) query.set('classroomId', params.classroomId);
  if (params?.studentId) query.set('studentId', params.studentId);

  const response = await fetch(`/api/enrollments?${query.toString()}`, { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load enrollments');

  return json.enrollments;
}

export async function createEnrollment(params: CreateEnrollmentParams) {
  const response = await fetch('/api/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create enrollment');

  return json.enrollment;
}

export async function getEnrollmentProgress(id: string): Promise<EnrollmentProgress> {
  const response = await fetch(`/api/enrollments/${id}/progress`, { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load student progress');
  return json;
}
