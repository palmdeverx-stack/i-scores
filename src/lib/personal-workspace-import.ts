import 'server-only';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export type ImportablePersonalWorkspace = {
  sourceSchoolId: string;
  sourceSchoolName: string;
  counts: {
    classrooms: number;
    subjects: number;
    students: number;
  };
};

type SchoolCandidate = {
  id: string;
  name: string;
  workspace_type: string;
  imported_at: string | null;
  import_dismissed_at: string | null;
};

/** Finds a not-yet-resolved personal workspace belonging to the same contact email as the caller. */
export async function findImportablePersonalWorkspace(params: {
  email: string | null;
  excludeAppUserId: string;
}): Promise<ImportablePersonalWorkspace | null> {
  if (!params.email) return null;

  const { data: candidates } = await supabaseAdmin
    .from('app_users')
    .select(
      'id, school:schools!app_users_school_id_fkey(id, name, workspace_type, imported_at, import_dismissed_at)'
    )
    .ilike('email', params.email)
    .eq('role', 'teacher')
    .neq('id', params.excludeAppUserId);

  const source = (candidates ?? [])
    .map((candidate) =>
      Array.isArray(candidate.school) ? candidate.school[0] : candidate.school
    )
    .find(
      (school): school is SchoolCandidate =>
        !!school &&
        school.workspace_type === 'personal' &&
        !school.imported_at &&
        !school.import_dismissed_at
    );

  if (!source) return null;

  const [{ count: classroomCount }, { count: subjectCount }, { count: studentCount }] =
    await Promise.all([
      supabaseAdmin
        .from('classrooms')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', source.id),
      supabaseAdmin
        .from('subjects')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', source.id),
      supabaseAdmin
        .from('app_users')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', source.id)
        .eq('role', 'student'),
    ]);

  return {
    sourceSchoolId: source.id,
    sourceSchoolName: source.name,
    counts: {
      classrooms: classroomCount ?? 0,
      subjects: subjectCount ?? 0,
      students: studentCount ?? 0,
    },
  };
}
