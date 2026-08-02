import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { writeSecurityAudit } from 'src/lib/security-audit';
import { isSchoolAccessUsable } from 'src/lib/school-subscription';
import {
  isSignInAllowed,
  AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS,
} from 'src/lib/auth-rate-limit';
import {
  signAppToken,
  toPublicUser,
  signPinChallenge,
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from 'src/lib/auth-token';
import {
  isStaffAuthRole,
  syncLinkedStaffAuth,
  linkStaffToSupabaseAuth,
  verifyStaffSupabasePassword,
} from 'src/lib/staff-supabase-auth';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (
    typeof username !== 'string' ||
    !username.trim() ||
    username.length > 320 ||
    typeof password !== 'string' ||
    !password ||
    password.length > 1024
  ) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' }, { status: 400 });
  }

  const normalizedUsername = username.trim();

  if (!(await isSignInAllowed(request, normalizedUsername))) {
    await writeSecurityAudit({
      action: 'auth.rate_limited',
      request,
      targetType: 'username',
      metadata: { username: normalizedUsername.toLowerCase() },
    });
    return NextResponse.json(
      { message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' },
      {
        status: 429,
        headers: {
          'Retry-After': String(AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .ilike('username', normalizedUsername)
    .single();

  if (!user) {
    await writeSecurityAudit({
      action: 'auth.sign_in_failed',
      request,
      targetType: 'username',
      metadata: { reason: 'invalid_credentials' },
    });
    return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  let passwordMatches = false;
  if (user.role === 'student') {
    passwordMatches = await bcrypt.compare(password, user.password_hash);
  } else if (isStaffAuthRole(user.role)) {
    if (user.auth_user_id) {
      passwordMatches = await verifyStaffSupabasePassword(user, password);
      if (passwordMatches) {
        const synced = await syncLinkedStaffAuth(user, {
          isActive: user.is_active !== false,
        });
        if (!synced.ok) {
          console.error('Failed to sync Supabase Auth metadata', synced.message);
          return NextResponse.json(
            { message: 'ไม่สามารถอัปเดตข้อมูลบัญชีกลางได้ กรุณาลองใหม่อีกครั้ง' },
            { status: 503 }
          );
        }
      }
    } else {
      // One-time legacy verification. A successful login moves the credential
      // to Supabase Auth without asking the account holder to reset it.
      passwordMatches = await bcrypt.compare(password, user.password_hash);
      if (passwordMatches) {
        const linked = await linkStaffToSupabaseAuth(user, password);
        if (!linked.ok) {
          console.error('Failed to migrate staff account to Supabase Auth', linked.message);
          return NextResponse.json(
            {
              message:
                'ยืนยันรหัสผ่านสำเร็จ แต่ยังย้ายบัญชีไป Supabase Auth ไม่ได้ กรุณาติดต่อผู้ดูแลระบบ',
            },
            { status: 503 }
          );
        }
      }
    }
  }

  if (!passwordMatches) {
    await writeSecurityAudit({
      action: 'auth.sign_in_failed',
      actorUserId: user.id,
      schoolId: user.school_id,
      request,
      targetType: 'app_user',
      targetId: user.id,
      metadata: { reason: 'invalid_credentials' },
    });
    return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  const studentCannotAccess =
    user.role === 'student' && (user.student_status ?? 'studying') !== 'studying';

  if (user.is_active === false || studentCannotAccess) {
    await writeSecurityAudit({
      action: 'auth.sign_in_blocked',
      actorUserId: user.id,
      schoolId: user.school_id,
      request,
      targetType: 'app_user',
      targetId: user.id,
      metadata: { reason: studentCannotAccess ? 'student_status' : 'account_inactive' },
    });
    return NextResponse.json(
      {
        message: studentCannotAccess
          ? 'สถานะนักเรียนไม่สามารถเข้าใช้งานระบบได้ กรุณาติดต่อผู้ดูแลโรงเรียน'
          : 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลโรงเรียน',
      },
      { status: 403 }
    );
  }

  if (user.role !== 'master_admin') {
    const [{ data: school }, schoolAccessUsable] = await Promise.all([
      supabaseAdmin.from('schools').select('is_active').eq('id', user.school_id).maybeSingle(),
      isSchoolAccessUsable(user.school_id, { userId: user.id, role: user.role }),
    ]);
    if (!school?.is_active) {
      return NextResponse.json(
        { message: 'โรงเรียนถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }
    if (!schoolAccessUsable) {
      return NextResponse.json(
        { message: 'แพ็กเกจโรงเรียนหมดอายุหรือถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }
  }

  if (user.role === 'master_admin' || user.role === 'school_admin') {
    await writeSecurityAudit({
      action: 'auth.password_verified',
      actorUserId: user.id,
      schoolId: user.school_id,
      request,
      targetType: 'app_user',
      targetId: user.id,
      metadata: { requiresPin: true },
    });
    const response = NextResponse.json({
      requiresPin: true,
      pinChallengeToken: signPinChallenge(user.id),
      role: user.role,
    });
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }

  const accessToken = signAppToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    schoolId: user.school_id,
    authProvider: 'password',
  });

  const response = NextResponse.json({ user: toPublicUser(user) });
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions);
  await writeSecurityAudit({
    action: 'auth.sign_in_succeeded',
    actorUserId: user.id,
    schoolId: user.school_id,
    request,
    targetType: 'app_user',
    targetId: user.id,
    metadata: { role: user.role },
  });
  return response;
}
