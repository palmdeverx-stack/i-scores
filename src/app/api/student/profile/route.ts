import { NextResponse } from 'next/server';

import { today, fIsBetween } from 'src/utils/format-time';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type AcademicYear = {
  year: string;
  start_date: string | null;
  end_date: string | null;
};

type Classroom = {
  name: string;
  grade_level: string | null;
  academic_year: AcademicYear | null;
};

async function loadStudentProfile(studentId: string, schoolId: string | null) {
  const [
    { data: student, error: studentError },
    { data: school, error: schoolError },
    enrollmentResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('id, username, email, first_name, last_name, avatar_url, created_at')
      .eq('id', studentId)
      .eq('role', 'student')
      .maybeSingle(),
    schoolId
      ? supabaseAdmin
          .from('schools')
          .select('id, name, code, logo_url')
          .eq('id', schoolId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from('enrollments')
      .select(
        `id, student_number, created_at,
           classroom:classrooms(name, grade_level, academic_year:academic_years(year, start_date, end_date))`
      )
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
  ]);

  if (studentError || schoolError || enrollmentResult.error) {
    throw new Error(
      studentError?.message ?? schoolError?.message ?? enrollmentResult.error?.message
    );
  }

  if (!student) return null;

  const enrollments = enrollmentResult.data.map((row) => ({
    ...row,
    classroom: row.classroom as unknown as Classroom,
  }));
  const enrollment =
    enrollments.find((row) =>
      fIsBetween(
        today(),
        row.classroom?.academic_year?.start_date,
        row.classroom?.academic_year?.end_date
      )
    ) ??
    enrollments[0] ??
    null;

  return { ...student, school, enrollment };
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['student']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const profile = await loadStudentProfile(caller.sub, caller.schoolId);

    if (!profile) {
      return NextResponse.json({ message: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const caller = requireRole(request, ['student']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!firstName || !lastName) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อและนามสกุล' }, { status: 400 });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('app_users')
    .update({ first_name: firstName, last_name: lastName, email: email || null })
    .eq('id', caller.sub)
    .eq('role', 'student');

  if (error) {
    const message = error.code === '23505' ? 'อีเมลนี้ถูกใช้งานแล้ว' : error.message;
    return NextResponse.json({ message }, { status: 400 });
  }

  try {
    const profile = await loadStudentProfile(caller.sub, caller.schoolId);
    return NextResponse.json({ profile });
  } catch (loadError) {
    return NextResponse.json(
      {
        message:
          loadError instanceof Error
            ? loadError.message
            : 'บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ',
      },
      { status: 500 }
    );
  }
}
