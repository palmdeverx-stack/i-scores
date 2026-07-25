'use client';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type ClassroomScheduleAssignment = {
  id: string;
  subject: { id: string; name: string; code: string | null } | null;
  teacher: { id: string; first_name: string | null; last_name: string | null } | null;
};

export type ClassroomScheduleSlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_assignment_id: string;
};

export type ClassroomSchedule = {
  classroom: { id: string; name: string; grade_level: string | null };
  assignments: ClassroomScheduleAssignment[];
  schedules: ClassroomScheduleSlot[];
};

function authHeader() {
  return { Authorization: `Bearer ${getStoredToken()}` };
}

export async function getClassroomSchedule(
  classroomId: string,
  semesterId: string
): Promise<ClassroomSchedule> {
  const response = await fetch(
    `/api/classrooms/${classroomId}/schedule?semesterId=${semesterId}`,
    { headers: authHeader() }
  );
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'Failed to load classroom schedule');
  return json;
}

export type AddScheduleSlotParams = {
  teacherAssignmentId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export async function addScheduleSlot(
  params: AddScheduleSlotParams
): Promise<ClassroomScheduleSlot> {
  const response = await fetch(`/api/teacher-assignments/${params.teacherAssignmentId}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({
      dayOfWeek: params.dayOfWeek,
      startTime: params.startTime,
      endTime: params.endTime,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'Failed to add schedule slot');
  return json.schedule;
}

export async function deleteScheduleSlot(
  teacherAssignmentId: string,
  scheduleId: string
): Promise<void> {
  const response = await fetch(
    `/api/teacher-assignments/${teacherAssignmentId}/schedules/${scheduleId}`,
    { method: 'DELETE', headers: authHeader() }
  );
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'Failed to delete schedule slot');
}
