import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { validateDutyStaff, parseDutyScheduleInput } from 'src/lib/duty-roster';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { id } = await context.params;
  const input = parseDutyScheduleInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ message: 'ข้อมูลตารางเวรไม่ถูกต้อง' }, { status: 400 });
  }
  if (!(await validateDutyStaff(caller.schoolId, input.staffIds))) {
    return NextResponse.json({ message: 'พบรายชื่อครูที่ไม่อยู่ในโรงเรียน' }, { status: 400 });
  }

  const { data: assigneeUpdate, error: assigneeUpdateError } = await supabaseAdmin.rpc(
    'update_school_duty_assignees_if_schedule_unchanged',
    {
      target_school_id: caller.schoolId,
      target_schedule_id: id,
      target_duty_date: input.dutyDate,
      target_shift: input.shift,
      target_starts_at: input.startsAt,
      target_ends_at: input.endsAt,
      target_location: input.location,
      target_note: input.note,
      target_staff_ids: input.staffIds,
      target_weekdays: input.weekdays,
      target_repeat_until: input.repeatUntil,
    }
  );

  if (assigneeUpdateError) {
    return NextResponse.json({ message: assigneeUpdateError.message }, { status: 400 });
  }

  if (assigneeUpdate?.matched) {
    return NextResponse.json({ result: assigneeUpdate });
  }

  const { data, error } = await supabaseAdmin.rpc('save_school_duty_schedule_series', {
    target_school_id: caller.schoolId,
    target_schedule_id: id,
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
      { status: error.code === '23505' ? 409 : 400 }
    );
  }

  return NextResponse.json({ result: data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { id } = await context.params;
  const { data, error } = await supabaseAdmin
    .from('school_duty_schedules')
    .delete()
    .eq('id', id)
    .eq('school_id', caller.schoolId)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'ไม่พบตารางเวร' }, { status: 404 });
  return NextResponse.json({ success: true });
}
