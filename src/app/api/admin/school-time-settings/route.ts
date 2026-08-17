import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { parseSchoolPeriod, parseSchoolTimeSettings } from 'src/lib/school-time-settings';

const DEFAULT_SETTINGS = {
  timezone: 'Asia/Bangkok',
  active_weekdays: [1, 2, 3, 4, 5],
  arrival_open_time: '06:00:00',
  school_start_time: '08:00:00',
  late_after_time: '08:00:00',
  school_end_time: '16:00:00',
  departure_close_time: '18:00:00',
  bell_sync_enabled: false,
};

const SETTINGS_SELECT =
  'timezone, active_weekdays, arrival_open_time, school_start_time, late_after_time, school_end_time, departure_close_time, bell_sync_enabled';
const PERIOD_SELECT =
  'id, period_number, name, period_type, starts_at, ends_at, ring_at_start, ring_at_end, is_active, created_at';

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const [settingsResult, periodsResult] = await Promise.all([
    supabaseAdmin
      .from('school_time_settings')
      .select(SETTINGS_SELECT)
      .eq('school_id', caller.schoolId)
      .maybeSingle(),
    supabaseAdmin
      .from('school_periods')
      .select(PERIOD_SELECT)
      .eq('school_id', caller.schoolId)
      .order('starts_at')
      .order('period_number'),
  ]);

  if (settingsResult.error || periodsResult.error) {
    return NextResponse.json(
      { message: settingsResult.error?.message ?? periodsResult.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    settings: settingsResult.data ?? DEFAULT_SETTINGS,
    periods: periodsResult.data ?? [],
  });
}

export async function PATCH(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const input = parseSchoolTimeSettings(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ message: 'วันหรือเวลาทำการของโรงเรียนไม่ถูกต้อง' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('school_time_settings').upsert({
    school_id: caller.schoolId,
    timezone: 'Asia/Bangkok',
    active_weekdays: input.activeWeekdays,
    arrival_open_time: input.arrivalOpenTime,
    school_start_time: input.schoolStartTime,
    late_after_time: input.lateAfterTime,
    school_end_time: input.schoolEndTime,
    departure_close_time: input.departureCloseTime,
    updated_by: caller.sub,
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const input = parseSchoolPeriod(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ message: 'ข้อมูลคาบเรียนไม่ถูกต้อง' }, { status: 400 });

  const { data: overlappingPeriod, error: overlapError } = await supabaseAdmin
    .from('school_periods')
    .select('id, name, starts_at, ends_at')
    .eq('school_id', caller.schoolId)
    .lt('starts_at', input.endsAt)
    .gt('ends_at', input.startsAt)
    .limit(1)
    .maybeSingle();
  if (overlapError) {
    return NextResponse.json({ message: overlapError.message }, { status: 500 });
  }
  if (overlappingPeriod) {
    return NextResponse.json(
      {
        message: `ช่วงเวลาซ้อนกับ “${overlappingPeriod.name}” ${overlappingPeriod.starts_at.slice(0, 5)}–${overlappingPeriod.ends_at.slice(0, 5)} น.`,
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('school_periods')
    .insert({
      school_id: caller.schoolId,
      period_number: input.periodNumber,
      name: input.name,
      period_type: input.periodType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      ring_at_start: input.ringAtStart,
      ring_at_end: input.ringAtEnd,
      is_active: input.isActive,
    })
    .select('id')
    .single();
  if (error || !data) {
    return NextResponse.json(
      {
        message:
          error?.code === '23505'
            ? 'มีหมายเลขคาบนี้แล้ว'
            : error?.code === '23P01'
              ? 'ช่วงเวลานี้ซ้อนกับคาบหรือกิจกรรมที่มีอยู่แล้ว'
              : (error?.message ?? 'ไม่สามารถเพิ่มคาบเรียนได้'),
      },
      { status: error?.code === '23505' || error?.code === '23P01' ? 409 : 500 }
    );
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
