'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type TimetableSlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_assignment: {
    id: string;
    subject: { name: string; code: string } | null;
    classroom: {
      name: string;
      academic_years: { year: string } | null;
    } | null;
    semester: { name: string } | null;
  };
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function getTimetable(): Promise<TimetableSlot[]> {
  const response = await fetch('/api/teacher/timetable', { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load timetable');

  return json.schedules;
}
