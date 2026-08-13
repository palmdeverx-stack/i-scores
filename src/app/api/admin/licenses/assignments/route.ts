import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const licenseId = typeof body?.licenseId === 'string' ? body.licenseId : '';
  const teacherId = typeof body?.teacherId === 'string' ? body.teacherId : '';
  if (!licenseId || !teacherId) {
    return NextResponse.json({ message: 'ข้อมูลระบบ E-KRU หรือครูไม่ครบถ้วน' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const [{ data: license }, { data: teacher }] = await Promise.all([
    supabaseAdmin
      .from('marketplace_school_licenses')
      .select('id, license_scope, seat_count, status, starts_at, expires_at')
      .eq('id', licenseId)
      .eq('school_id', caller.schoolId)
      .maybeSingle(),
    supabaseAdmin
      .from('app_users')
      .select('id, is_active')
      .eq('id', teacherId)
      .eq('school_id', caller.schoolId)
      .eq('role', 'teacher')
      .maybeSingle(),
  ]);

  if (
    !license ||
    license.license_scope !== 'teacher' ||
    license.status !== 'active' ||
    license.starts_at > now ||
    license.expires_at <= now
  ) {
    return NextResponse.json(
      { message: 'ระบบ E-KRU นี้ไม่พร้อมสำหรับการมอบสิทธิ์รายครู' },
      { status: 409 }
    );
  }
  if (!teacher?.is_active) {
    return NextResponse.json({ message: 'ไม่พบครูหรือบัญชีถูกปิดใช้งาน' }, { status: 404 });
  }

  const { count } = await supabaseAdmin
    .from('marketplace_teacher_license_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('license_id', licenseId)
    .is('revoked_at', null);
  if ((count ?? 0) >= license.seat_count) {
    return NextResponse.json(
      { message: `จำนวนครูที่ใช้ระบบได้เต็มแล้ว (${count}/${license.seat_count})` },
      { status: 409 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from('marketplace_teacher_license_assignments')
    .select('id, revoked_at')
    .eq('license_id', licenseId)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = existing?.revoked_at
    ? await supabaseAdmin
        .from('marketplace_teacher_license_assignments')
        .update({
          revoked_at: null,
          assigned_by: caller.sub,
          assigned_at: now,
        })
        .eq('id', existing.id)
        .select('id, license_id, teacher_id, assigned_at, revoked_at')
        .single()
    : existing
      ? { data: existing, error: null }
      : await supabaseAdmin
          .from('marketplace_teacher_license_assignments')
          .insert({
            license_id: licenseId,
            teacher_id: teacherId,
            assigned_by: caller.sub,
          })
          .select('id, license_id, teacher_id, assigned_at, revoked_at')
          .single();

  if (result.error || !result.data) {
    return NextResponse.json(
      { message: result.error?.message ?? 'ไม่สามารถมอบสิทธิ์ใช้งานระบบ E-KRU ได้' },
      { status: 500 }
    );
  }
  return NextResponse.json({ assignment: result.data }, { status: 201 });
}
