import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  loadTeacherAssignment,
  canAccessTeacherAssignment,
} from 'src/lib/teacher-assignment-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string; scheduleId: string }> };

const DAY_LABEL = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id, scheduleId } = await params;
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
    return NextResponse.json({ message: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น' }, { status: 400 });
  }

  const { data: teacherSchedules } = await supabaseAdmin
    .from('teaching_schedules')
    .select(
      'id, day_of_week, start_time, end_time, teacher_assignment:teacher_assignments!inner(teacher_id, subject:subjects(name), classroom:classrooms(name))'
    )
    .eq('day_of_week', dayOfWeek)
    .eq('teacher_assignment.teacher_id', teacherAssignment!.teacher_id)
    .neq('id', scheduleId);

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
    .update({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    })
    .eq('id', scheduleId)
    .eq('teacher_assignment_id', id)
    .select('id, day_of_week, start_time, end_time')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  if (!schedule) {
    return NextResponse.json({ message: 'ไม่พบคาบสอนที่ต้องการแก้ไข' }, { status: 404 });
  }

  return NextResponse.json({ schedule });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id, scheduleId } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);

  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('teaching_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('teacher_assignment_id', id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
