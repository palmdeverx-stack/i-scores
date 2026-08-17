import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { parseSchoolPeriod } from 'src/lib/school-time-settings';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { id } = await context.params;
  const input = parseSchoolPeriod(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ message: 'ข้อมูลคาบเรียนไม่ถูกต้อง' }, { status: 400 });

  const { data: overlappingPeriod, error: overlapError } = await supabaseAdmin
    .from('school_periods')
    .select('id, name, starts_at, ends_at')
    .eq('school_id', caller.schoolId)
    .neq('id', id)
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
    .update({
      period_number: input.periodNumber,
      name: input.name,
      period_type: input.periodType,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      ring_at_start: input.ringAtStart,
      ring_at_end: input.ringAtEnd,
      is_active: input.isActive,
    })
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      {
        message:
          error?.code === '23505'
            ? 'มีหมายเลขคาบนี้แล้ว'
            : error?.code === '23P01'
              ? 'ช่วงเวลานี้ซ้อนกับคาบหรือกิจกรรมที่มีอยู่แล้ว'
              : (error?.message ?? 'ไม่พบคาบเรียน'),
      },
      { status: error?.code === '23505' || error?.code === '23P01' ? 409 : 404 }
    );
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { id } = await context.params;
  const { data, error } = await supabaseAdmin
    .from('school_periods')
    .delete()
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบคาบเรียน' }, { status: 404 });
  return NextResponse.json({ success: true });
}
