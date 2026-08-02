import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { getWorkspaceProfile } from 'src/lib/user-workspaces';
import { isSchoolAccessUsable } from 'src/lib/school-subscription';
import {
  signAppToken,
  verifyAppToken,
  getRequestToken,
  signPinChallenge,
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from 'src/lib/auth-token';

// ----------------------------------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const token = getRequestToken(request);
  const caller = token ? verifyAppToken(token) : null;
  if (!caller || caller.role === 'marketplace_user' || caller.impersonatedBy) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const profileId = typeof body?.profileId === 'string' ? body.profileId : '';
  if (!UUID_PATTERN.test(profileId)) {
    return NextResponse.json({ message: 'Workspace ไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: currentUser } = await supabaseAdmin
    .from('app_users')
    .select('auth_user_id')
    .eq('id', caller.sub)
    .eq('is_active', true)
    .maybeSingle();
  if (!currentUser?.auth_user_id) {
    return NextResponse.json({ message: 'บัญชีนี้ยังไม่รองรับการสลับ Workspace' }, { status: 403 });
  }

  const target = await getWorkspaceProfile(profileId, currentUser.auth_user_id);
  if (!target) {
    return NextResponse.json({ message: 'ไม่พบสิทธิ์เข้าใช้งาน Workspace นี้' }, { status: 403 });
  }

  if (target.school.workspace_type === 'school') {
    const usable = await isSchoolAccessUsable(target.school_id, {
      userId: target.id,
      role: target.role,
    });
    if (!usable) {
      return NextResponse.json(
        { message: 'License ของโรงเรียนยังไม่พร้อมใช้งาน' },
        { status: 403 }
      );
    }
  }

  if (target.role === 'master_admin' || target.role === 'school_admin') {
    return NextResponse.json({
      requiresPin: true,
      pinChallengeToken: signPinChallenge(target.id, caller.authProvider ?? 'password'),
      role: target.role,
    });
  }

  const accessToken = signAppToken({
    sub: target.id,
    username: target.username,
    role: target.role,
    schoolId: target.school_id,
    authProvider: caller.authProvider ?? 'password',
  });
  const response = NextResponse.json({ role: target.role });
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions);
  return response;
}
