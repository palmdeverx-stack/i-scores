import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['present', 'absent', 'leave', 'late'] as const;

type RouteParams = { params: Promise<{ id: string }> };

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id: classroomId } = await params;
  const { searchParams } = new URL(request.url);
  const semesterId = searchParams.get('semesterId') ?? '';
  const subjectId = searchParams.get('subjectId') ?? '';
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search')?.trim().slice(0, 100).toLocaleLowerCase('th') ?? '';
  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';
  const page = positiveInteger(searchParams.get('page'), 1);
  const pageSize = Math.min(positiveInteger(searchParams.get('pageSize'), 25), 100);

  if (
    !UUID_PATTERN.test(classroomId) ||
    !UUID_PATTERN.test(semesterId) ||
    (subjectId && !UUID_PATTERN.test(subjectId)) ||
    !DATE_PATTERN.test(startDate) ||
    !DATE_PATTERN.test(endDate) ||
    startDate > endDate ||
    (status && !STATUSES.includes(status as (typeof STATUSES)[number]))
  ) {
    return NextResponse.json({ message: 'ตัวกรองไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: classroom } = await supabaseAdmin
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('school_id', caller.schoolId)
    .maybeSingle();
  if (!classroom) {
    return NextResponse.json({ message: 'ไม่พบห้องเรียนนี้' }, { status: 404 });
  }

  let matchedStudentIds: string[] | null = null;
  if (search) {
    const { data: enrollmentRows, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select(
        `student_number,
         student:app_users!enrollments_student_id_fkey!inner(
           id, username, first_name, last_name, student_code, school_id, role
         )`
      )
      .eq('classroom_id', classroomId)
      .eq('student.school_id', caller.schoolId)
      .eq('student.role', 'student');
    if (enrollmentError) {
      return NextResponse.json({ message: enrollmentError.message }, { status: 500 });
    }
    matchedStudentIds = (enrollmentRows ?? []).flatMap((row) => {
      const student = Array.isArray(row.student) ? row.student[0] : row.student;
      if (!student) return [];
      const searchable = [
        row.student_number,
        student.student_code,
        student.username,
        student.first_name,
        student.last_name,
        `${student.first_name ?? ''} ${student.last_name ?? ''}`,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th');
      return searchable.includes(search) ? [student.id] : [];
    });
  }

  const { data: assignmentRows, error: assignmentsError } = await supabaseAdmin
    .from('teacher_assignments')
    .select('subject:subjects!inner(id, code, name)')
    .eq('classroom_id', classroomId)
    .eq('semester_id', semesterId);
  if (assignmentsError) {
    return NextResponse.json({ message: assignmentsError.message }, { status: 500 });
  }

  const subjectMap = new Map<string, { id: string; code: string | null; name: string }>();
  for (const row of assignmentRows ?? []) {
    const subject = Array.isArray(row.subject) ? row.subject[0] : row.subject;
    if (subject) subjectMap.set(subject.id, subject);
  }
  const subjects = Array.from(subjectMap.values()).sort((a, b) =>
    `${a.code ?? ''}${a.name}`.localeCompare(`${b.code ?? ''}${b.name}`, 'th')
  );

  if (matchedStudentIds && !matchedStudentIds.length) {
    return NextResponse.json({ records: [], subjects, total: 0, page, pageSize });
  }

  const from = (page - 1) * pageSize;
  let query = supabaseAdmin
    .from('attendance')
    .select(
      `id, session_date, period_key, status, note, updated_at,
       student:app_users!attendance_student_id_fkey!inner(
         id, username, first_name, last_name, student_code, avatar_url, school_id, role
       ),
       teacher_assignment:teacher_assignments!inner(
         id, classroom_id, semester_id, subject_id,
         subject:subjects!inner(id, code, name)
       )`,
      { count: 'exact' }
    )
    .eq('teacher_assignment.classroom_id', classroomId)
    .eq('teacher_assignment.semester_id', semesterId)
    .eq('student.school_id', caller.schoolId)
    .eq('student.role', 'student')
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (subjectId) query = query.eq('teacher_assignment.subject_id', subjectId);
  if (status) query = query.eq('status', status);
  if (matchedStudentIds) query = query.in('student_id', matchedStudentIds);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const records = (data ?? []).flatMap((record) => {
    const student = Array.isArray(record.student) ? record.student[0] : record.student;
    const assignment = Array.isArray(record.teacher_assignment)
      ? record.teacher_assignment[0]
      : record.teacher_assignment;
    const subject = assignment
      ? Array.isArray(assignment.subject)
        ? assignment.subject[0]
        : assignment.subject
      : null;
    if (!student || !subject) return [];

    return [
      {
        id: record.id,
        attendanceDate: record.session_date,
        periodKey: record.period_key,
        status: record.status,
        note: record.note,
        updatedAt: record.updated_at,
        subject,
        student: {
          id: student.id,
          username: student.username,
          firstName: student.first_name,
          lastName: student.last_name,
          studentCode: student.student_code,
          avatarUrl: student.avatar_url,
        },
      },
    ];
  });

  return NextResponse.json({ records, subjects, total: count ?? 0, page, pageSize });
}
