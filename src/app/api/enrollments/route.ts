import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get('classroomId');
  const studentId = searchParams.get('studentId');

  let query = supabaseAdmin
    .from('enrollments')
    .select(
      `id, student_number, created_at,
       student:app_users(id, username, first_name, last_name),
       classroom:classrooms!inner(id, name, school_id, academic_year_id, academic_years(year))`
    )
    .eq('classroom.school_id', caller.schoolId)
    .order('created_at', { ascending: false });

  if (classroomId) query = query.eq('classroom_id', classroomId);
  if (studentId) query = query.eq('student_id', studentId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ enrollments: data });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { studentId, classroomId, studentNumber } = await request.json();

  if (!studentId || !classroomId) {
    return NextResponse.json({ message: 'กรุณาเลือกนักเรียนและห้องเรียน' }, { status: 400 });
  }

  const [{ data: student }, { data: classroom }] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('id')
      .eq('id', studentId)
      .eq('role', 'student')
      .eq('school_id', caller.schoolId)
      .maybeSingle(),
    supabaseAdmin
      .from('classrooms')
      .select('id, academic_year_id')
      .eq('id', classroomId)
      .eq('school_id', caller.schoolId)
      .maybeSingle(),
  ]);

  if (!student || !classroom) {
    return NextResponse.json(
      { message: 'ไม่พบนักเรียนหรือห้องเรียนนี้ในโรงเรียนของคุณ' },
      { status: 404 }
    );
  }

  const { data: existingEnrollment } = await supabaseAdmin
    .from('enrollments')
    .select('classroom_id, classroom:classrooms(name)')
    .eq('student_id', studentId)
    .eq('academic_year_id', classroom.academic_year_id)
    .maybeSingle();

  if (existingEnrollment) {
    if (existingEnrollment.classroom_id === classroomId) {
      return NextResponse.json(
        { message: 'นักเรียนคนนี้อยู่ในห้องนี้อยู่แล้ว' },
        { status: 409 }
      );
    }

    const existingClassroomName = (existingEnrollment.classroom as any)?.name ?? 'ห้องอื่น';

    return NextResponse.json(
      {
        message: `นักเรียนคนนี้อยู่ห้อง "${existingClassroomName}" แล้วในปีการศึกษานี้ นักเรียน 1 คนอยู่ได้เพียง 1 ห้องเรียนต่อปีการศึกษา`,
      },
      { status: 409 }
    );
  }

  const { data: enrollment, error } = await supabaseAdmin
    .from('enrollments')
    .insert({
      student_id: studentId,
      classroom_id: classroomId,
      student_number: studentNumber || null,
    })
    .select('id, student_id, classroom_id, student_number, created_at')
    .single();

  if (error || !enrollment) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { message: 'นักเรียนคนนี้อยู่ในห้องเรียนอื่นแล้วในปีการศึกษานี้' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error?.message ?? 'Failed to create enrollment' },
      { status: 500 }
    );
  }

  return NextResponse.json({ enrollment }, { status: 201 });
}
