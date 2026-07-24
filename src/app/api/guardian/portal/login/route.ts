import { cookies } from 'next/headers';
import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { decryptLineCredential } from 'src/lib/line-credentials';
import { hashGuardianPortalCode, verifyGuardianPortalToken } from 'src/lib/guardian-portal-token';

// ----------------------------------------------------------------------

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;

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
  if (!studentCode || studentCode.length > 50 || /[%]/.test(studentCode)) {
    return NextResponse.json({ message: 'กรุณากรอกรหัสนักเรียนให้ถูกต้อง' }, { status: 400 });
  }

  const student = await findStudent(identity.schoolId, studentCode);
  if (
    !student ||
    student.is_active === false ||
    (student.student_status ?? 'studying') !== 'studying'
  ) {
    return NextResponse.json({ message: 'ไม่พบนักเรียนที่ใช้งานอยู่ด้วยรหัสนี้' }, { status: 404 });
  }

  const { count: guardianCount } = await supabaseAdmin
    .from('student_guardians')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', identity.schoolId)
    .eq('student_id', student.id)
    .eq('line_user_id', identity.lineUserId);
  if (!guardianCount) {
    return NextResponse.json(
      { message: 'รหัสนักเรียนไม่ตรงกับบัญชี LINE ผู้ปกครองที่เชื่อมไว้' },
      { status: 403 }
    );
  }

  const { data: latestCode } = await supabaseAdmin
    .from('guardian_portal_login_codes')
    .select('created_at')
    .eq('school_id', identity.schoolId)
    .eq('line_user_id', identity.lineUserId)
    .eq('student_id', student.id)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestCode && Date.now() - new Date(latestCode.created_at).getTime() < RESEND_DELAY_MS) {
    return NextResponse.json(
      { message: 'ส่งรหัสแล้ว กรุณารอ 1 นาทีก่อนขอรหัสใหม่' },
      { status: 429 }
    );
  }

  const { data: integration } = await supabaseAdmin
    .from('school_line_integrations')
    .select('is_enabled, channel_access_token_encrypted')
    .eq('school_id', identity.schoolId)
    .maybeSingle();
  if (!integration?.is_enabled || !integration.channel_access_token_encrypted) {
    return NextResponse.json(
      { message: 'โรงเรียนยังไม่พร้อมส่งรหัสยืนยันผ่าน LINE' },
      { status: 409 }
    );
  }

  const code = randomInt(100000, 1000000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_LIFETIME_MS);
  await supabaseAdmin
    .from('guardian_portal_login_codes')
    .update({ consumed_at: now.toISOString() })
    .eq('school_id', identity.schoolId)
    .eq('line_user_id', identity.lineUserId)
    .eq('student_id', student.id)
    .is('consumed_at', null);
  const { error: codeError } = await supabaseAdmin.from('guardian_portal_login_codes').insert({
    school_id: identity.schoolId,
    line_user_id: identity.lineUserId,
    student_id: student.id,
    code_hash: hashGuardianPortalCode(identity.schoolId, identity.lineUserId, student.id, code),
    expires_at: expiresAt.toISOString(),
  });
  if (codeError) {
    return NextResponse.json({ message: codeError.message }, { status: 500 });
  }

  try {
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${decryptLineCredential(
          integration.channel_access_token_encrypted
        )}`,
      },
      body: JSON.stringify({
        to: identity.lineUserId,
        messages: [
          {
            type: 'text',
            text: [
              '🔐 รหัสเข้าสู่ระบบ Parent Portal',
              `OTP: ${code}`,
              'รหัสมีอายุ 5 นาทีและใช้ได้ครั้งเดียว',
              'หากคุณไม่ได้เป็นผู้ขอรหัส กรุณาไม่ต้องดำเนินการใด ๆ',
            ].join('\n\n'),
          },
        ],
      }),
    });
    if (!lineResponse.ok) {
      await supabaseAdmin
        .from('guardian_portal_login_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('school_id', identity.schoolId)
        .eq('line_user_id', identity.lineUserId)
        .eq('student_id', student.id)
        .is('consumed_at', null);
      return NextResponse.json(
        { message: 'ไม่สามารถส่ง OTP ไปยัง LINE ได้ กรุณาลองใหม่' },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { message: 'ไม่สามารถเชื่อมต่อ LINE เพื่อส่ง OTP ได้' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    studentCode,
    expiresIn: OTP_LIFETIME_MS / 1000,
  });
}
