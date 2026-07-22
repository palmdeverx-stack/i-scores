import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type Relation = Record<string, any> | null;

function bangkokDayOfWeek() {
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date());

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday) + 1;
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const [teacherResult, schoolResult, teachingResult] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('id, username, first_name, last_name')
      .eq('id', caller.sub)
      .eq('role', 'teacher')
      .maybeSingle(),
    caller.schoolId
      ? supabaseAdmin
          .from('schools')
          .select('id, name, code, logo_url')
          .eq('id', caller.schoolId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from('teacher_assignments')
      .select(
        `id, created_at,
         subject:subjects(id, code, name, image_url),
         classroom:classrooms(id, name, grade_level, academic_year:academic_years(year)),
         semester:semesters(id, name, is_active, start_date, end_date)`
      )
      .eq('teacher_id', caller.sub)
      .order('created_at', { ascending: false }),
  ]);

  const firstError = teacherResult.error ?? schoolResult.error ?? teachingResult.error;
  if (firstError) {
    return NextResponse.json({ message: firstError.message }, { status: 500 });
  }
  if (!teacherResult.data) {
    return NextResponse.json({ message: 'ไม่พบข้อมูลครูผู้สอน' }, { status: 404 });
  }

  const teachingRows = teachingResult.data ?? [];
  const teachingIds = teachingRows.map((row) => row.id);
  const classroomIds = Array.from(
    new Set(
      teachingRows
        .map((row) => (row.classroom as unknown as { id: string } | null)?.id)
        .filter(Boolean) as string[]
    )
  );

  const [assignmentsResult, enrollmentsResult, schedulesResult] = await Promise.all([
    teachingIds.length
      ? supabaseAdmin
          .from('assignments')
          .select('id, teacher_assignment_id, title, full_score, created_at')
          .in('teacher_assignment_id', teachingIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    classroomIds.length
      ? supabaseAdmin
          .from('enrollments')
          .select('student_id, classroom_id')
          .in('classroom_id', classroomIds)
      : Promise.resolve({ data: [], error: null }),
    teachingIds.length
      ? supabaseAdmin
          .from('teaching_schedules')
          .select('id, teacher_assignment_id, day_of_week, start_time, end_time')
          .in('teacher_assignment_id', teachingIds)
          .eq('day_of_week', bangkokDayOfWeek())
          .order('start_time')
      : Promise.resolve({ data: [], error: null }),
  ]);

  const relatedError = assignmentsResult.error ?? enrollmentsResult.error ?? schedulesResult.error;
  if (relatedError) {
    return NextResponse.json({ message: relatedError.message }, { status: 500 });
  }

  const assignments = assignmentsResult.data ?? [];
  const enrollments = enrollmentsResult.data ?? [];
  const schedules = schedulesResult.data ?? [];
  const assignmentIds = assignments.map((row) => row.id);
  const scoresResult = assignmentIds.length
    ? await supabaseAdmin
        .from('scores')
        .select('assignment_id, student_id, score, status')
        .in('assignment_id', assignmentIds)
    : { data: [], error: null };

  if (scoresResult.error) {
    return NextResponse.json({ message: scoresResult.error.message }, { status: 500 });
  }

  const scoreRows = scoresResult.data ?? [];
  const teachingById = new Map(teachingRows.map((row) => [row.id, row]));
  const enrollmentCountByClassroom = new Map<string, number>();
  enrollments.forEach((row) => {
    enrollmentCountByClassroom.set(
      row.classroom_id,
      (enrollmentCountByClassroom.get(row.classroom_id) ?? 0) + 1
    );
  });

  const recentAssignments = assignments.slice(0, 6).map((assignment) => {
    const assignmentScores = scoreRows.filter((score) => score.assignment_id === assignment.id);
    const teaching = teachingById.get(assignment.teacher_assignment_id);
    const classroom = teaching?.classroom as unknown as { id: string } | null;

    return {
      ...assignment,
      full_score: Number(assignment.full_score),
      subject: teaching?.subject as unknown as Relation,
      classroom: teaching?.classroom as unknown as Relation,
      semester: teaching?.semester as unknown as Relation,
      student_count: classroom ? (enrollmentCountByClassroom.get(classroom.id) ?? 0) : 0,
      submitted_count: assignmentScores.filter((score) =>
        ['submitted', 'late', 'pending_review'].includes(score.status)
      ).length,
      graded_count: assignmentScores.filter((score) => score.score !== null).length,
    };
  });

  const todaySchedules = schedules.map((schedule) => {
    const teaching = teachingById.get(schedule.teacher_assignment_id);
    return {
      ...schedule,
      subject: teaching?.subject as unknown as Relation,
      classroom: teaching?.classroom as unknown as Relation,
      semester: teaching?.semester as unknown as Relation,
    };
  });

  return NextResponse.json({
    teacher: teacherResult.data,
    school: schoolResult.data,
    summary: {
      teaching_assignments: teachingRows.length,
      subjects: new Set(
        teachingRows
          .map((row) => (row.subject as unknown as { id: string } | null)?.id)
          .filter(Boolean)
      ).size,
      classrooms: classroomIds.length,
      students: new Set(enrollments.map((row) => row.student_id)).size,
      assignments: assignments.length,
      waiting_to_grade: scoreRows.filter(
        (score) =>
          ['submitted', 'late', 'pending_review'].includes(score.status) && score.score === null
      ).length,
    },
    today_schedules: todaySchedules,
    recent_assignments: recentAssignments,
  });
}
