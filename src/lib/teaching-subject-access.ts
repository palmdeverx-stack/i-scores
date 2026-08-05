import 'server-only';

import type { AppTokenPayload } from './auth-token';

import { subjectVisibilityFilter } from 'src/features/subject-catalog/server/subject-catalog-service';

import { supabaseAdmin } from './supabase-admin';

// ----------------------------------------------------------------------

export async function loadSubjectForTeaching(
  caller: AppTokenPayload,
  subjectId: string,
  semesterId: string
) {
  let query = supabaseAdmin
    .from('subjects')
    .select('id, scope, school_id, created_by, status, academic_year_id, semester_id')
    .eq('id', subjectId)
    .or(subjectVisibilityFilter(caller));

  if (caller.role !== 'school_admin') {
    query = query.or(`status.eq.published,created_by.eq.${caller.sub}`);
  }

  const { data: subject } = await query.maybeSingle();
  if (!subject) return null;

  if (subject.scope === 'school') {
    if (subject.school_id !== caller.schoolId || subject.semester_id !== semesterId) return null;
  }

  return subject;
}

export function teachingSubjectMatchesAcademicYear(
  subject: Awaited<ReturnType<typeof loadSubjectForTeaching>>,
  academicYearId: string
) {
  return subject?.scope !== 'school' || subject.academic_year_id === academicYearId;
}
