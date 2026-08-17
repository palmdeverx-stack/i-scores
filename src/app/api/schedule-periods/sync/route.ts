import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'เฉพาะผู้ดูแลโรงเรียนเท่านั้น' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const semesterId = typeof body?.semesterId === 'string' ? body.semesterId : '';
  if (!semesterId) {
    return NextResponse.json({ message: 'กรุณาเลือกภาคเรียน' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('sync_school_periods_to_semester_with_snapshot', {
    target_school_id: caller.schoolId,
    target_semester_id: semesterId,
    actor_id: caller.sub,
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 409 });

  return NextResponse.json({ result: data });
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'เฉพาะผู้ดูแลโรงเรียนเท่านั้น' }, { status: 403 });
  }

  const semesterId = new URL(request.url).searchParams.get('semesterId') ?? '';
  if (!semesterId) {
    return NextResponse.json({ message: 'กรุณาเลือกภาคเรียน' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('school_period_sync_runs')
    .select('id, created_at')
    .eq('school_id', caller.schoolId)
    .eq('semester_id', semesterId)
    .is('undone_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({
    canUndo: !!data,
    syncedAt: data?.created_at ?? null,
  });
}

export async function DELETE(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'เฉพาะผู้ดูแลโรงเรียนเท่านั้น' }, { status: 403 });
  }

  const semesterId = new URL(request.url).searchParams.get('semesterId') ?? '';
  if (!semesterId) {
    return NextResponse.json({ message: 'กรุณาเลือกภาคเรียน' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('undo_school_period_sync', {
    target_school_id: caller.schoolId,
    target_semester_id: semesterId,
    actor_id: caller.sub,
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 409 });

  return NextResponse.json({ result: data });
}
