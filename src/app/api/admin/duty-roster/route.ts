import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  validateDutyStaff,
  DUTY_SCHEDULE_SELECT,
  parseDutyScheduleInput,
} from 'src/lib/duty-roster';

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let schedulesQuery = supabaseAdmin
    .from('school_duty_schedules')
    .select(DUTY_SCHEDULE_SELECT)
    .eq('school_id', caller.schoolId)
    .order('duty_date')
    .order('starts_at');
  if (from) schedulesQuery = schedulesQuery.gte('duty_date', from);
  if (to) schedulesQuery = schedulesQuery.lte('duty_date', to);

  const [schedulesResult, staffResult] = await Promise.all([
    schedulesQuery.limit(500),
    supabaseAdmin
      .from('app_users')
      .select('id, username, first_name, last_name, avatar_url')
      .eq('school_id', caller.schoolId)
      .eq('role', 'teacher')
      .eq('is_active', true)
      .order('first_name'),
  ]);

  if (schedulesResult.error || staffResult.error) {
    return NextResponse.json(
      { message: schedulesResult.error?.message ?? staffResult.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    schedules: schedulesResult.data ?? [],
    staff: staffResult.data ?? [],
  });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const input = parseDutyScheduleInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ message: 'ข้อมูลตารางเวรไม่ถูกต้อง' }, { status: 400 });
  }
  if (!(await validateDutyStaff(caller.schoolId, input.staffIds))) {
    return NextResponse.json({ message: 'พบรายชื่อครูที่ไม่อยู่ในโรงเรียน' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('save_school_duty_schedule_series', {
    target_school_id: caller.schoolId,
    target_schedule_id: null,
    actor_id: caller.sub,
    target_duty_date: input.dutyDate,
    target_shift: input.shift,
    target_starts_at: input.startsAt,
    target_ends_at: input.endsAt,
    target_location: input.location,
    target_note: input.note,
    target_staff_ids: input.staffIds,
    target_weekdays: input.weekdays,
    target_repeat_until: input.repeatUntil,
  });

  if (error) {
    return NextResponse.json(
      {
        message: error.code === '23505' ? 'มีตารางเวรช่วงเวลาและจุดนี้แล้ว' : error.message,
      },
      { status: error.code === '23505' ? 409 : 500 }
    );
  }

  return NextResponse.json({ result: data }, { status: 201 });
}
