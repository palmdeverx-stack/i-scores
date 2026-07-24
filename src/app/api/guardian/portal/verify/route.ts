import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  hashGuardianPortalCode,
  verifyGuardianPortalToken,
  signGuardianPortalSessionToken,
} from 'src/lib/guardian-portal-token';

// ----------------------------------------------------------------------

async function findStudent(schoolId: string, studentCode: string) {
  const select = 'id, username, student_code, is_active, student_status';
  const { data: byStudentCode } = await supabaseAdmin
    .from('app_users')
    .select(select)
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .ilike('student_code', studentCode)
    .limit(5);
  const normalized = studentCode.toLocaleLowerCase('en');
  const exactStudentCode = (byStudentCode ?? []).find(
    (student) => student.student_code?.toLocaleLowerCase('en') === normalized
  );
  if (exactStudentCode) return exactStudentCode;

  const { data: byUsername } = await supabaseAdmin
    .from('app_users')
    .select(select)
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .ilike('username', studentCode)
    .limit(5);
  return (
    (byUsername ?? []).find((student) => student.username.toLocaleLowerCase('en') === normalized) ??
    null
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const identityToken = cookieStore.get('guardian_portal_identity')?.value ?? '';
  const identity =
    verifyGuardianPortalToken(identityToken, 'identity') ??
    verifyGuardianPortalToken(identityToken, 'link');
  if (!identity) {
    return NextResponse.json(
      { message: 'กรุณาเปิด Parent Portal จากลิงก์ใน LINE ผู้ปกครอง' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const studentCode = typeof body?.studentCode === 'string' ? body.studentCode.trim() : '';
  const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
  if (!studentCode || studentCode.length > 50 || /[%]/.test(studentCode) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ message: 'กรุณากรอก OTP 6 หลัก' }, { status: 400 });
  }

  const student = await findStudent(identity.schoolId, studentCode);
  if (
    !student ||
    student.is_active === false ||
    (student.student_status ?? 'studying') !== 'studying'
  ) {
    return NextResponse.json({ message: 'ไม่สามารถยืนยันข้อมูลนักเรียนได้' }, { status: 403 });
  }

  const { count: guardianCount } = await supabaseAdmin
    .from('student_guardians')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', identity.schoolId)
    .eq('student_id', student.id)
    .eq('line_user_id', identity.lineUserId);
  if (!guardianCount) {
    return NextResponse.json({ message: 'ไม่สามารถยืนยันข้อมูลนักเรียนได้' }, { status: 403 });
  }

  const { data: loginCode } = await supabaseAdmin
    .from('guardian_portal_login_codes')
    .select('id, code_hash, attempts, expires_at')
    .eq('school_id', identity.schoolId)
    .eq('line_user_id', identity.lineUserId)
    .eq('student_id', student.id)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!loginCode || loginCode.expires_at <= new Date().toISOString()) {
    return NextResponse.json({ message: 'OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' }, { status: 410 });
  }
  if (loginCode.attempts >= 5) {
    return NextResponse.json({ message: 'กรอก OTP ผิดเกินกำหนด กรุณาขอรหัสใหม่' }, { status: 429 });
  }

  const expectedHash = hashGuardianPortalCode(
    identity.schoolId,
    identity.lineUserId,
    student.id,
    code
  );
  if (expectedHash !== loginCode.code_hash) {
    await supabaseAdmin
      .from('guardian_portal_login_codes')
      .update({ attempts: loginCode.attempts + 1 })
      .eq('id', loginCode.id);
    return NextResponse.json(
      { message: `OTP ไม่ถูกต้อง เหลืออีก ${4 - loginCode.attempts} ครั้ง` },
      { status: 401 }
    );
  }

  await supabaseAdmin
    .from('guardian_portal_login_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', loginCode.id);

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: 'guardian_portal_session',
    value: signGuardianPortalSessionToken(identity.schoolId, identity.lineUserId, student.id),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('guardian_portal_session');
  return response;
}
