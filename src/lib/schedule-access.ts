import 'server-only';

import type { AppTokenPayload } from './auth-token';
import type { loadTeacherAssignment } from './teacher-assignment-access';

import { hasDepartmentPermission } from './department-permission-access';
import { canAccessTeacherAssignment } from './teacher-assignment-access';

// ----------------------------------------------------------------------

/**
 * True if `teacherId` has been delegated schedule-management for the whole
 * school via the 'schedule.manage' department permission.
 */
export function hasTimetableCapability(teacherId: string, schoolId: string): Promise<boolean> {
  return hasDepartmentPermission(teacherId, schoolId, 'schedule.manage');
}

export async function canManageAssignmentSchedule(
  caller: AppTokenPayload,
  teacherAssignment: Awaited<ReturnType<typeof loadTeacherAssignment>>
): Promise<boolean> {
  if (canAccessTeacherAssignment(caller, teacherAssignment)) return true;
  if (caller.role !== 'teacher' || !caller.schoolId || !teacherAssignment) return false;

  const classroomSchoolId = (teacherAssignment.classrooms as unknown as { school_id: string })
    ?.school_id;
  if (classroomSchoolId !== caller.schoolId) return false;

  return hasTimetableCapability(caller.sub, caller.schoolId);
}

export async function canManageClassroomSchedule(
  caller: AppTokenPayload,
  classroomSchoolId: string | null
): Promise<boolean> {
  if (!classroomSchoolId || classroomSchoolId !== caller.schoolId) return false;
  if (caller.role === 'school_admin') return true;
  if (caller.role !== 'teacher') return false;

  return hasTimetableCapability(caller.sub, caller.schoolId);
}
