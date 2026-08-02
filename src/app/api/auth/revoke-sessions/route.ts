import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { writeSecurityAudit } from 'src/lib/security-audit';
import {
  requireRole,
  ACCESS_TOKEN_COOKIE,
  MASTER_SESSION_COOKIE,
} from 'src/lib/auth-token';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const caller = requireRole(request, [
    'master_admin',
    'school_admin',
    'teacher',
    'student',
    'marketplace_user',
  ]);
  if (!caller || caller.impersonatedBy) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const table = caller.role === 'marketplace_user' ? 'marketplace_users' : 'app_users';
  const { error } = await supabaseAdmin
    .from(table)
    .update({ session_revoked_at: new Date().toISOString() })
    .eq('id', caller.sub);
  if (error) {
    return NextResponse.json({ message: 'ไม่สามารถยกเลิก session ได้' }, { status: 500 });
  }

  await writeSecurityAudit({
    action: 'session.revoke_all',
    actorUserId: caller.role === 'marketplace_user' ? null : caller.sub,
    schoolId: caller.schoolId,
    request,
    targetType: caller.role === 'marketplace_user' ? 'marketplace_user' : 'app_user',
    targetId: caller.sub,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(MASTER_SESSION_COOKIE);
  return response;
}
