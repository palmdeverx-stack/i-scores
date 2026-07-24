import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { verifyGuardianPortalToken } from 'src/lib/guardian-portal-token';

// ----------------------------------------------------------------------

export async function GET() {
  const cookieStore = await cookies();
  const payload = verifyGuardianPortalToken(
    cookieStore.get('guardian_portal_session')?.value ?? '',
    'session'
  );
  if (!payload) {
    return NextResponse.json(
      { message: 'ลิงก์หมดอายุ กรุณาพิมพ์ “ข้อมูลนักเรียน” ใน LINE อีกครั้ง' },
      { status: 401 }
    );
  }

  const { data: guardians, error: guardianError } = await supabaseAdmin
    .from('student_guardians')
    .select('student_id, full_name, relationship')
    .eq('school_id', payload.schoolId)
    .eq('line_user_id', payload.lineUserId);
  if (guardianError) {
    return NextResponse.json({ message: guardianError.message }, { status: 500 });
  }

  const studentIds = Array.from(new Set((guardians ?? []).map((guardian) => guardian.student_id)));
  if (!studentIds.length) {
    return NextResponse.json(
      { message: 'ไม่พบนักเรียนที่เชื่อมกับบัญชี LINE นี้' },
      { status: 404 }
    );
  }

  const [{ data: school, error: schoolError }, { data: students, error: studentError }] =
    await Promise.all([
      supabaseAdmin
        .from('schools')
        .select('id, name, code, logo_url')
        .eq('id', payload.schoolId)
        .maybeSingle(),
      supabaseAdmin
        .from('app_users')
        .select(
          `id, name_prefix, first_name, last_name, first_name_en, last_name_en, nickname,
           avatar_url, student_status, student_code, birth_date, gender, nationality, religion`
        )
        .eq('school_id', payload.schoolId)
        .eq('role', 'student')
        .in('id', studentIds),
    ]);
  if (schoolError || studentError) {
    return NextResponse.json(
      { message: schoolError?.message ?? studentError?.message },
      { status: 500 }
    );
  }

  const { data: enrollments, error: enrollmentError } = await supabaseAdmin
    .from('enrollments')
    .select(
      `student_id, student_number, created_at,
       classroom:classrooms!inner(id, name, grade_level, school_id,
         academic_year:academic_years(year, is_active))`
    )
    .in('student_id', studentIds)
    .eq('classroom.school_id', payload.schoolId)
    .order('created_at', { ascending: false });
  if (enrollmentError) {
    return NextResponse.json({ message: enrollmentError.message }, { status: 500 });
  }

  const enrollmentByStudent = new Map<string, (typeof enrollments)[number]>();
  for (const enrollment of enrollments ?? []) {
    if (!enrollmentByStudent.has(enrollment.student_id)) {
      enrollmentByStudent.set(enrollment.student_id, enrollment);
    }
  }
  const guardianByStudent = new Map(
    (guardians ?? []).map((guardian) => [
      guardian.student_id,
      { fullName: guardian.full_name, relationship: guardian.relationship },
    ])
  );

  return NextResponse.json({
    school,
    students: (students ?? []).map((student) => ({
      ...student,
      guardian: guardianByStudent.get(student.id) ?? null,
      enrollment: enrollmentByStudent.get(student.id) ?? null,
    })),
  });
}
