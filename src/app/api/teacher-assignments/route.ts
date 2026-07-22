import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  let query = supabaseAdmin
    .from('teacher_assignments')
    .select(
      `id, created_at,
       teacher:app_users!teacher_assignments_teacher_id_fkey(id, username, first_name, last_name),
       subject:subjects(id, code, name, image_url, academic_year_id, semester_id),
       classroom:classrooms(id, name, academic_year_id),
       semester:semesters(id, name, academic_year_id)`
    )
    .order('created_at', { ascending: false });

  if (caller.role === 'teacher') {
    query = query.eq('teacher_id', caller.sub);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ teacherAssignments: data });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin', 'teacher']);

  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { teacherId, subjectId, classroomId, semesterId } = await request.json();
  const resolvedTeacherId = caller.role === 'teacher' ? caller.sub : teacherId;

  if (!resolvedTeacherId || !subjectId || !classroomId || !semesterId) {
    return NextResponse.json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  }

  const [{ data: teacher }, { data: subject }, { data: classroom }, { data: semester }] =
    await Promise.all([
      supabaseAdmin
        .from('app_users')
        .select('id')
        .eq('id', resolvedTeacherId)
        .eq('role', 'teacher')
        .eq('school_id', caller.schoolId)
        .maybeSingle(),
      supabaseAdmin
        .from('subjects')
        .select('id, academic_year_id')
        .eq('id', subjectId)
        .eq('semester_id', semesterId)
        .eq('school_id', caller.schoolId)
        .maybeSingle(),
      supabaseAdmin
        .from('classrooms')
        .select('id, academic_year_id')
        .eq('id', classroomId)
        .eq('school_id', caller.schoolId)
        .maybeSingle(),
      supabaseAdmin
        .from('semesters')
        .select('id, academic_year_id, academic_years!inner(school_id)')
        .eq('id', semesterId)
        .eq('academic_years.school_id', caller.schoolId)
        .maybeSingle(),
    ]);

  if (!teacher || !subject || !classroom || !semester) {
    return NextResponse.json(
      { message: 'ไม่พบครู วิชา ห้องเรียน หรือภาคเรียนนี้ในโรงเรียนของคุณ' },
      { status: 404 }
    );
  }

  if (
    subject.academic_year_id !== classroom.academic_year_id ||
    subject.academic_year_id !== semester.academic_year_id
  ) {
    return NextResponse.json(
      { message: 'รายวิชา ห้องเรียน และภาคเรียนต้องอยู่ในปีการศึกษาเดียวกัน' },
      { status: 400 }
    );
  }

  const { data: existingAssignment } = await supabaseAdmin
    .from('teacher_assignments')
    .select(
      'teacher:app_users!teacher_assignments_teacher_id_fkey(first_name, last_name, username)'
    )
    .eq('classroom_id', classroomId)
    .eq('subject_id', subjectId)
    .eq('semester_id', semesterId)
    .maybeSingle();

  if (existingAssignment) {
    const existingTeacher = existingAssignment.teacher as unknown as {
      first_name: string | null;
      last_name: string | null;
      username: string;
    };
    const existingTeacherName =
      [existingTeacher.first_name, existingTeacher.last_name].filter(Boolean).join(' ') ||
      existingTeacher.username;

    return NextResponse.json(
      {
        message: `วิชานี้ในห้องนี้มีครูผู้สอนอยู่แล้วคือ "${existingTeacherName}" ห้องเรียนหนึ่งสามารถมีครูสอนวิชาเดียวกันได้เพียง 1 คนต่อภาคเรียน`,
      },
      { status: 409 }
    );
  }

  const { data: assignment, error } = await supabaseAdmin
    .from('teacher_assignments')
    .insert({
      teacher_id: resolvedTeacherId,
      subject_id: subjectId,
      classroom_id: classroomId,
      semester_id: semesterId,
    })
    .select('id, teacher_id, subject_id, classroom_id, semester_id, created_at')
    .single();

  if (error || !assignment) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { message: 'วิชานี้ในห้องนี้มีครูผู้สอนอยู่แล้วในภาคเรียนนี้' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error?.message ?? 'Failed to create teacher assignment' },
      { status: 500 }
    );
  }

  return NextResponse.json({ teacherAssignment: assignment }, { status: 201 });
}
