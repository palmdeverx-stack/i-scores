'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type SubmissionStatus =
  | 'submitted'
  | 'late'
  | 'not_submitted'
  | 'absent'
  | 'sick_leave'
  | 'pending_review';

export type ScoreEntry = {
  id: string | null;
  score: number | null;
  feedback: string | null;
  status: SubmissionStatus;
};

export type GradebookRow = {
  student: { id: string; username: string; first_name: string | null; last_name: string | null };
  studentNumber: string | null;
  score: ScoreEntry;
};

export type Gradebook = {
  assignment: { id: string; title: string; full_score: number };
  rows: GradebookRow[];
};

export type SaveScoreParams = {
  studentId: string;
  score?: number | null;
  feedback?: string;
  status?: SubmissionStatus;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function getGradebook(assignmentId: string): Promise<Gradebook> {
  const response = await fetch(`/api/assignments/${assignmentId}/scores`, {
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load gradebook');

  return json;
}

export async function saveScore(assignmentId: string, params: SaveScoreParams) {
  const response = await fetch(`/api/assignments/${assignmentId}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to save score');

  return json.score;
}
