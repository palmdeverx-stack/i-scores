import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { canManageClassroomSchedule } from 'src/lib/schedule-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const semesterId = searchParams.get('semesterId');
  if (!semesterId) return NextResponse.json({ message: 'กรุณาเลือกภาคเรียน' }, { status: 400 });

  const { data: classroom } = await supabaseAdmin
    .from('classrooms')
    .select('id, name, grade_level, school_id')
    .eq('id', id)
    .maybeSingle();
  if (!classroom) return NextResponse.json({ message: 'ไม่พบห้องเรียนนี้' }, { status: 404 });

  if (!(await canManageClassroomSchedule(caller, classroom.school_id))) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from('teacher_assignments')
    .select(
      'id, subject:subjects(id, name, code), teacher:app_users!teacher_assignments_teacher_id_fkey(id, first_name, last_name)'
    )
    .eq('classroom_id', id)
    .eq('semester_id', semesterId);

  if (assignmentsError)
    return NextResponse.json({ message: assignmentsError.message }, { status: 500 });

  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);

  const { data: schedules, error: schedulesError } = assignmentIds.length
    ? await supabaseAdmin
        .from('teaching_schedules')
        .select('id, day_of_week, start_time, end_time, teacher_assignment_id')
        .in('teacher_assignment_id', assignmentIds)
    : { data: [], error: null };

  if (schedulesError)
    return NextResponse.json({ message: schedulesError.message }, { status: 500 });

  return NextResponse.json({ classroom, assignments, schedules });
}
