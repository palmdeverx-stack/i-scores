import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { loadTeacherAssignment, canAccessTeacherAssignment } from 'src/lib/teacher-assignment-access';

// ----------------------------------------------------------------------

const DAY_LABEL = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);

  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('teaching_schedules')
    .select('id, day_of_week, start_time, end_time')
    .eq('teacher_assignment_id', id)
    .order('day_of_week')
    .order('start_time');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedules: data });
}

export async function POST(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);

  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { dayOfWeek, startTime, endTime } = await request.json();

  if (!dayOfWeek || !startTime || !endTime) {
    return NextResponse.json(
      { message: 'กรุณาเลือกวันและเวลาเริ่ม-สิ้นสุดให้ครบถ้วน' },
      { status: 400 }
    );
  }

  if (dayOfWeek < 1 || dayOfWeek > 7) {
    return NextResponse.json({ message: 'วันในสัปดาห์ไม่ถูกต้อง' }, { status: 400 });
  }

  if (startTime >= endTime) {
    return NextResponse.json(
      { message: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น' },
      { status: 400 }
    );
  }

  // A teacher can't be in two classes at once — check every schedule slot
  // across all of this teacher's assignments for a time overlap on the same day.
  const { data: teacherSchedules } = await supabaseAdmin
    .from('teaching_schedules')
    .select(
      'day_of_week, start_time, end_time, teacher_assignment:teacher_assignments!inner(teacher_id, subject:subjects(name), classroom:classrooms(name))'
    )
    .eq('day_of_week', dayOfWeek)
    .eq('teacher_assignment.teacher_id', teacherAssignment!.teacher_id);

  // Compare as HH:MM — Postgres returns `time` values as "HH:MM:SS", which
  // would otherwise sort before the shorter "HH:MM" input as a string prefix.
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  const conflict = teacherSchedules?.find(
    (slot) => start < toMinutes(slot.end_time) && end > toMinutes(slot.start_time)
  );

  if (conflict) {
    const conflictAssignment = conflict.teacher_assignment as unknown as {
      subject: { name: string } | null;
      classroom: { name: string } | null;
    };

    return NextResponse.json(
      {
        message: `เวลานี้ครูมีคาบสอน "${conflictAssignment.subject?.name ?? ''}" ห้อง ${conflictAssignment.classroom?.name ?? ''} อยู่แล้ว (วัน${DAY_LABEL[dayOfWeek]} ${conflict.start_time}-${conflict.end_time})`,
      },
      { status: 409 }
    );
  }

  const { data: schedule, error } = await supabaseAdmin
    .from('teaching_schedules')
    .insert({
      teacher_assignment_id: id,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    })
    .select('id, day_of_week, start_time, end_time')
    .single();

  if (error || !schedule) {
    return NextResponse.json(
      { message: error?.message ?? 'Failed to create schedule' },
      { status: 500 }
    );
  }

  return NextResponse.json({ schedule }, { status: 201 });
}
