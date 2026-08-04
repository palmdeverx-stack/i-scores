import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('teacher_assignments')
    .select(
      `id,
       subject:subjects!inner(
         id, curriculum_id, code, name, description, learning_area, grade_levels, scope,
         learning_standard_code, learning_standards, learning_outcomes, indicators, learning_units,
         curriculum:curricula(id, school_id, owner_id, code, name, version, curriculum_type, scope, status),
         curriculum_indicators(id, subject_id, code, description, learning_standard),
         learning_outcomes_structured:subject_learning_outcomes(id, subject_id, code, description, sequence),
         learning_units_structured:subject_learning_units(id, subject_id, code, name, description, sequence, estimated_periods)
       ),
       classroom:classrooms!inner(id, name, grade_level, school_id, academic_year:academic_years(year)),
       semester:semesters(id, name)`
    )
    .eq('teacher_id', caller.sub)
    .eq('classroom.school_id', caller.schoolId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ options: data ?? [] });
}
