'use client';

import type { SubmissionStatus } from 'src/sections/gradebook/gradebook-actions';
import type { AssignmentCategory } from 'src/sections/assignment/assignment-actions';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type ScoreReport = {
  teacherAssignmentId: string;
  subject: { name: string; code: string | null };
  classroom: { name: string; academicYear: string | null };
  semesterName: string | null;
  assignments: Array<{
    id: string;
    title: string;
    category: AssignmentCategory;
    fullScore: number;
  }>;
  students: Array<{
    id: string;
    studentNumber: string | null;
    studentCode: string | null;
    username: string;
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
    scores: Record<string, { score: number | null; status: SubmissionStatus }>;
  }>;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function getScoreReport(teacherAssignmentId: string): Promise<ScoreReport> {
  const response = await fetch(`/api/teacher-assignments/${teacherAssignmentId}/score-report`, {
    headers: authHeader(),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'ไม่สามารถสร้างรายงานคะแนนได้');
  return json.report;
}
