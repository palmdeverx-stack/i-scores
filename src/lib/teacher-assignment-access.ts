import 'server-only';

import type { AppTokenPayload } from './auth-token';

import { supabaseAdmin } from './supabase-admin';

// ----------------------------------------------------------------------

export async function loadTeacherAssignment(id: string) {
  const { data } = await supabaseAdmin
    .from('teacher_assignments')
    .select(
      `id, teacher_id, classroom_id, subject_id, semester_id,
       classrooms(school_id, name, academic_years(year)),
       subjects(name, code, credits),
       teacher:app_users!teacher_assignments_teacher_id_fkey(username, first_name, last_name),
       semesters(name)`
    )
    .eq('id', id)
    .single();

  return data;
}

export function canAccessTeacherAssignment(
  caller: AppTokenPayload,
  teacherAssignment: Awaited<ReturnType<typeof loadTeacherAssignment>>
): boolean {
  if (!teacherAssignment) return false;
  if (caller.role === 'teacher') return teacherAssignment.teacher_id === caller.sub;
  if (caller.role === 'school_admin') {
    return (
      (teacherAssignment.classrooms as unknown as { school_id: string })?.school_id ===
      caller.schoolId
    );
  }
  return false;
}
