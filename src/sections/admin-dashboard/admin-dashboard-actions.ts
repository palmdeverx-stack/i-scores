'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

type Person = {
  first_name: string | null;
  last_name: string | null;
  username: string;
};

export type AdminDashboardData = {
  school: { id: string; name: string; code: string; logo_url: string | null };
  counts: {
    students: number;
    teachers: number;
    classrooms: number;
    subjects: number;
    enrollments: number;
  };
  academicYear: {
    id: string;
    year: string;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    semesters: Array<{
      id: string;
      name: string;
      is_active: boolean;
      start_date: string | null;
      end_date: string | null;
    }>;
  } | null;
  recentAssignments: Array<{
    id: string;
    created_at: string;
    teacher: Person;
    subject: { name: string; code: string | null };
    classroom: { name: string };
    semester: { name: string };
  }>;
  recentEnrollments: Array<{
    id: string;
    created_at: string;
    student_number: string | null;
    student: Person;
    classroom: { name: string };
  }>;
};

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const response = await fetch('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${getStoredToken()}` },
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load dashboard');
  return json;
}
