import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  verifyAppToken,
  getRequestToken,
  ACCESS_TOKEN_COOKIE,
  MASTER_SESSION_COOKIE,
  getMasterSessionToken,
  accessTokenCookieOptions,
} from 'src/lib/auth-token';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const previewToken = getRequestToken(request);
  const preview = previewToken ? verifyAppToken(previewToken) : null;
  const masterToken = getMasterSessionToken(request);
  const master = masterToken ? verifyAppToken(masterToken) : null;

  if (!preview?.impersonatedBy || !master || master.role !== 'master_admin') {
    return NextResponse.json({ message: 'ไม่พบ session ของ Master Admin' }, { status: 401 });
  }
  if (preview.impersonatedBy !== master.sub) {
    return NextResponse.json({ message: 'session ของ Master Admin ไม่ตรงกัน' }, { status: 403 });
  }

  if (preview.impersonationAuditId) {
    await supabaseAdmin
      .from('auth_impersonation_audit')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', preview.impersonationAuditId)
      .eq('master_user_id', master.sub)
      .is('ended_at', null);
  }

  const response = NextResponse.json({ redirectUrl: paths.master.root });
  response.cookies.set(ACCESS_TOKEN_COOKIE, masterToken!, accessTokenCookieOptions);
  response.cookies.delete(MASTER_SESSION_COOKIE);
  return response;
}
