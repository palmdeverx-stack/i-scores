import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { loadOwnedAttendanceScanSession } from 'src/lib/attendance-scan-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { id } = await params;
  const session = await loadOwnedAttendanceScanSession(id, caller.sub, caller.schoolId);
  if (!session) {
    return NextResponse.json({ message: 'ไม่พบรอบเช็คชื่อนี้' }, { status: 404 });
  }

  const { data: events, error } = await supabaseAdmin
    .from('attendance_scan_events')
    .select(
      `id, status, scanned_at,
       student:app_users!attendance_scan_events_student_id_fkey(
         id, username, first_name, last_name, student_code, avatar_url
       )`
    )
    .eq('session_id', id)
    .order('scanned_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ session, events: events ?? [] });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }
  const { id } = await params;
  const session = await loadOwnedAttendanceScanSession(id, caller.sub, caller.schoolId);
  if (!session) {
    return NextResponse.json({ message: 'ไม่พบรอบเช็คชื่อนี้' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('attendance_scan_sessions')
    .update({ status: 'closed' })
    .eq('id', id)
    .eq('teacher_id', caller.sub)
    .eq('school_id', caller.schoolId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
