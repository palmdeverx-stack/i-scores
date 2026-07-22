'use client';

import type { SubmissionStatus } from 'src/sections/gradebook/gradebook-actions';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type TeacherAssignment = {
  id: string;
  created_at: string;
  teacher: { id: string; username: string; first_name: string | null; last_name: string | null };
  subject: { id: string; name: string };
  classroom: { id: string; name: string };
  semester: { id: string; name: string };
};

export type CreateTeacherAssignmentParams = {
  teacherId: string;
  subjectId: string;
  classroomId: string;
  semesterId: string;
};

export type RosterRow = {
  id: string;
  student_number: string | null;
  student: { id: string; username: string; first_name: string | null; last_name: string | null };
};

export type Roster = {
  roster: RosterRow[];
  classroomName: string | null;
  subjectName: string | null;
  subjectCode: string | null;
  credits: number;
  academicYear: string | null;
  semesterName: string | null;
  teacher: { username: string; first_name: string | null; last_name: string | null } | null;
};

export type StudentBreakdownRow = {
  assignment: { id: string; title: string; full_score: number };
  score: { score: number | null; feedback: string | null; status: SubmissionStatus };
};

export type StudentBreakdown = {
  student: { id: string; username: string; first_name: string | null; last_name: string | null };
  rows: StudentBreakdownRow[];
};

export type ScheduleSlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type CreateScheduleParams = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function listTeacherAssignments(): Promise<TeacherAssignment[]> {
  const response = await fetch('/api/teacher-assignments', { headers: authHeader() });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load teacher assignments');

  return json.teacherAssignments;
}

export async function getRoster(teacherAssignmentId: string): Promise<Roster> {
  const response = await fetch(`/api/teacher-assignments/${teacherAssignmentId}/roster`, {
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load roster');

  return json;
}

export async function getStudentBreakdown(
  teacherAssignmentId: string,
  studentId: string
): Promise<StudentBreakdown> {
  const response = await fetch(
    `/api/teacher-assignments/${teacherAssignmentId}/students/${studentId}`,
    { headers: authHeader() }
  );
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load student breakdown');

  return json;
}

export async function getSchedules(teacherAssignmentId: string): Promise<ScheduleSlot[]> {
  const response = await fetch(`/api/teacher-assignments/${teacherAssignmentId}/schedules`, {
    headers: authHeader(),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to load schedules');

  return json.schedules;
}

export async function createSchedule(teacherAssignmentId: string, params: CreateScheduleParams) {
  const response = await fetch(`/api/teacher-assignments/${teacherAssignmentId}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create schedule');

  return json.schedule;
}

export async function deleteSchedule(
  teacherAssignmentId: string,
  scheduleId: string
): Promise<void> {
  const response = await fetch(
    `/api/teacher-assignments/${teacherAssignmentId}/schedules/${scheduleId}`,
    { method: 'DELETE', headers: authHeader() }
  );
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to delete schedule');
}

export async function createTeacherAssignment(params: CreateTeacherAssignmentParams) {
  const response = await fetch('/api/teacher-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(params),
  });
  const json = await response.json();

  if (!response.ok) throw new Error(json.message ?? 'Failed to create teacher assignment');

  return json.teacherAssignment;
}
