import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

type RouteContext = { params: Promise<{ scheduleId: string }> };

const QR_PREFIX = 'ISCORE-STUDENT:';

function bangkokNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}:${value('second')}`,
  };
}

async function loadDuty(scheduleId: string, schoolId: string, teacherId: string) {
  const { data } = await supabaseAdmin
    .from('school_duty_schedules')
    .select(
      `id, duty_date, starts_at, ends_at, location, shift,
       assignees:school_duty_assignees!inner(staff_id)`
    )
    .eq('id', scheduleId)
    .eq('school_id', schoolId)
    .eq('assignees.staff_id', teacherId)
    .maybeSingle();
  return data;
}

function dutyIsActive(duty: { duty_date: string; starts_at: string; ends_at: string }) {
  const now = bangkokNow();
  return now.date === duty.duty_date && now.time >= duty.starts_at && now.time <= duty.ends_at;
}

export async function GET(request: Request, context: RouteContext) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { scheduleId } = await context.params;
  const duty = await loadDuty(scheduleId, caller.schoolId, caller.sub);
  if (!duty) return NextResponse.json({ message: 'ไม่พบเวรที่ได้รับมอบหมาย' }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from('student_school_gate_attendance')
    .select(
      `id, entered_at, exited_at, is_late,
       student:app_users!student_school_gate_attendance_student_id_fkey(
         id, username, first_name, last_name, student_code, avatar_url
       )`
    )
    .eq('school_id', caller.schoolId)
    .eq('attendance_date', duty.duty_date)
    .order('updated_at', { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const records = data ?? [];
  const baseCount = () =>
    supabaseAdmin
      .from('student_school_gate_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', caller.schoolId!)
      .eq('attendance_date', duty.duty_date);
  const [enteredResult, exitedResult, lateResult] = await Promise.all([
    baseCount().not('entered_at', 'is', null),
    baseCount().not('exited_at', 'is', null),
    baseCount().eq('is_late', true),
  ]);
  return NextResponse.json({
    duty,
    active: dutyIsActive(duty),
    records,
    stats: {
      entered: enteredResult.count ?? 0,
      exited: exitedResult.count ?? 0,
      late: lateResult.count ?? 0,
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { scheduleId } = await context.params;
  const duty = await loadDuty(scheduleId, caller.schoolId, caller.sub);
  if (!duty) return NextResponse.json({ message: 'ไม่พบเวรที่ได้รับมอบหมาย' }, { status: 404 });
  if (!dutyIsActive(duty)) {
    return NextResponse.json(
      { message: 'สามารถสแกนได้เฉพาะวันและช่วงเวลาที่ปฏิบัติเวร' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const action = body?.action === 'exit' ? 'exit' : body?.action === 'entry' ? 'entry' : null;
  const payload = typeof body?.payload === 'string' ? body.payload.trim() : '';
  const token = payload.startsWith(QR_PREFIX) ? payload.slice(QR_PREFIX.length) : '';
  if (!action || !token) {
    return NextResponse.json({ message: 'QR นักเรียนไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: qr } = await supabaseAdmin
    .from('student_qr_codes')
    .select(
      `student_id, student:app_users!student_qr_codes_student_id_fkey(
        id, school_id, role, username, first_name, last_name, student_code, avatar_url
      )`
    )
    .eq('token', token)
    .eq('school_id', caller.schoolId)
    .eq('is_active', true)
    .maybeSingle();
  const student = Array.isArray(qr?.student) ? qr.student[0] : qr?.student;
  if (!qr || !student || student.role !== 'student' || student.school_id !== caller.schoolId) {
    return NextResponse.json({ message: 'ไม่พบนักเรียนของโรงเรียนนี้' }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from('student_school_gate_attendance')
    .select('id, entered_at, exited_at')
    .eq('school_id', caller.schoolId)
    .eq('student_id', qr.student_id)
    .eq('attendance_date', duty.duty_date)
    .maybeSingle();
  const scannedAt = new Date().toISOString();

  if (action === 'entry' && existing?.entered_at) {
    return NextResponse.json({ message: 'นักเรียนคนนี้สแกนเข้าแล้ว' }, { status: 409 });
  }
  if (action === 'exit' && !existing?.entered_at) {
    return NextResponse.json({ message: 'ยังไม่พบข้อมูลสแกนเข้าโรงเรียน' }, { status: 409 });
  }
  if (action === 'exit' && existing?.exited_at) {
    return NextResponse.json({ message: 'นักเรียนคนนี้สแกนออกแล้ว' }, { status: 409 });
  }

  let error;
  if (existing) {
    ({ error } = await supabaseAdmin
      .from('student_school_gate_attendance')
      .update(
        action === 'entry'
          ? { entered_at: scannedAt, entered_by: caller.sub, entry_duty_schedule_id: scheduleId }
          : { exited_at: scannedAt, exited_by: caller.sub, exit_duty_schedule_id: scheduleId }
      )
      .eq('id', existing.id));
  } else {
    const { data: settings } = await supabaseAdmin
      .from('school_time_settings')
      .select('late_after_time')
      .eq('school_id', caller.schoolId)
      .maybeSingle();
    ({ error } = await supabaseAdmin.from('student_school_gate_attendance').insert({
      school_id: caller.schoolId,
      student_id: qr.student_id,
      attendance_date: duty.duty_date,
      entered_at: scannedAt,
      entered_by: caller.sub,
      entry_duty_schedule_id: scheduleId,
      is_late: bangkokNow().time > (settings?.late_after_time ?? '08:00:00'),
    }));
  }
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ result: { action, scannedAt, student } });
}
