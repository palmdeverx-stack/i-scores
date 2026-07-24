'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type StudentQuiz = {
  id: string;
  title: string;
  description: string | null;
  full_score: number;
  due_at: string | null;
  subject: { id: string; code: string | null; name: string };
  classroom: { id: string; name: string };
  settings: {
    time_limit_minutes: number | null;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_score_after_submit: boolean;
  };
  questions: Array<{
    id: string;
    prompt: string;
    points: number;
    position: number;
    selection_mode: 'single' | 'multiple';
    options: Array<{ id: string; label: string; position: number }>;
  }>;
  attempt: {
    id: string;
    status: 'in_progress' | 'submitted';
    started_at: string;
    submitted_at: string | null;
    score: number | null;
    max_score: number | null;
  } | null;
};

export type QuizResult = {
  submittedAt: string;
  score: number | null;
  maxScore: number | null;
  showScore: boolean;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
  return json;
}

export async function getStudentQuiz(assignmentId: string): Promise<StudentQuiz> {
  const response = await fetch(`/api/student/quizzes/${assignmentId}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  const json = await parseResponse<{ quiz: StudentQuiz }>(response);
  return json.quiz;
}

export async function startStudentQuiz(assignmentId: string) {
  const response = await fetch(`/api/student/quizzes/${assignmentId}/start`, {
    method: 'POST',
    headers: authHeader(),
  });
  return parseResponse<{ attempt: StudentQuiz['attempt'] }>(response);
}

export async function submitStudentQuiz(
  assignmentId: string,
  attemptId: string,
  answers: Record<string, string[]>
) {
  const response = await fetch(`/api/student/quizzes/${assignmentId}/submit`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId, answers }),
  });
  const json = await parseResponse<{ result: QuizResult }>(response);
  return json.result;
}
