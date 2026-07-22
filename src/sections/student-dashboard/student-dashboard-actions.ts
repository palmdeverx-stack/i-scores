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

export type StudentPerson = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
};

export type StudentClassroom = {
  id: string;
  name: string;
  grade_level: string | null;
  academic_year: {
    id: string;
    year: string;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
  } | null;
};

export type StudentSubject = {
  id: string;
  teacher: StudentPerson;
  subject: {
    id: string;
    code: string | null;
    name: string;
    credits: number;
    description: string | null;
    image_url: string | null;
  };
  semester: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
  };
  classroom: StudentClassroom;
  assignments: Array<{
    id: string;
    title: string;
    description: string | null;
    full_score: number;
    created_at: string;
    score: number | null;
    feedback: string | null;
    status: SubmissionStatus;
    updated_at: string | null;
  }>;
};

export type StudentRankingRow = {
  rank: number;
  student: StudentPerson;
  student_number: string | null;
  score: number;
  full_score: number;
  percentage: number;
  is_current_student: boolean;
};

export type StudentDashboard = {
  student: StudentPerson;
  enrollments: Array<{
    id: string;
    student_number: string | null;
    classroom: StudentClassroom;
  }>;
  subjects: StudentSubject[];
  schedules: Array<{
    id: string;
    teacher_assignment_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject: StudentSubject['subject'];
    classroom: StudentClassroom;
    teacher: StudentPerson;
  }>;
  ranking: StudentRankingRow[];
  subject_rankings: Array<{
    id: string;
    subject: StudentSubject['subject'];
    semester: StudentSubject['semester'];
    ranking: StudentRankingRow[];
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    priority: 'normal' | 'important' | 'urgent';
    published_at: string;
    expires_at: string | null;
  }>;
};

export type StudentDashboardSection = 'home' | 'subjects' | 'assignments';

export async function getStudentDashboard(
  section: StudentDashboardSection = 'home'
): Promise<StudentDashboard> {
  const response = await fetch(`/api/student/dashboard?section=${section}`, {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load student dashboard');

  return json;
}
