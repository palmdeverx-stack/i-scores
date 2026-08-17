import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const semesterId = searchParams.get('semesterId');

  if (semesterId && !UUID_PATTERN.test(semesterId)) {
    return NextResponse.json({ message: 'Invalid semesterId' }, { status: 400 });
  }

  const { data: semesterRows, error: semestersError } = await supabaseAdmin
    .from('semesters')
    .select('id, name, is_active, start_date, academic_year:academic_years!inner(year, school_id)')
    .eq('academic_year.school_id', caller.schoolId);

  if (semestersError) {
    return NextResponse.json({ message: semestersError.message }, { status: 500 });
  }

  const semesterOptions = (semesterRows ?? [])
    .map((semester) => {
      const academicYear = semester.academic_year as unknown as { year: string };
      return {
        id: semester.id,
        name: semester.name,
        academicYear: academicYear.year,
        isActive: semester.is_active,
        startDate: semester.start_date,
      };
    })
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

  let query = supabaseAdmin
    .from('teacher_assignments')
    .select(
      `subject_id, classroom_id, semester_id,
       teacher:app_users!teacher_assignments_teacher_id_fkey!inner(school_id),
       classroom:classrooms!inner(id, name, school_id)`
    )
    .eq('teacher.school_id', caller.schoolId)
    .eq('classroom.school_id', caller.schoolId);

  if (caller.role === 'teacher') {
    query = query.eq('teacher_id', caller.sub);
  }

  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const classroomOptions = new Map(
    rows.map((row) => [
      (row.classroom as unknown as { id: string; name: string }).id,
      (row.classroom as unknown as { id: string; name: string }).name,
    ])
  );

  return NextResponse.json({
    classes: rows.length,
    subjects: new Set(rows.map((row) => row.subject_id)).size,
    classrooms: classroomOptions.size,
    semesters: new Set(rows.map((row) => row.semester_id)).size,
    classroomOptions: Array.from(classroomOptions, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'th')
    ),
    semesterOptions: semesterOptions.map(({ startDate: _, ...semester }) => semester),
    currentSemesterId: semesterOptions.find((semester) => semester.isActive)?.id ?? null,
  });
}
