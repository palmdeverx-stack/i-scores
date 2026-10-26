import { NextResponse } from 'next/server';

import { clearLineFlowCookies } from 'src/lib/line-login';
import { ACCESS_TOKEN_COOKIE, MASTER_SESSION_COOKIE } from 'src/lib/auth-token';
import { SSO_COOKIE, ssoCookieOptions, SSO_PENDING_COOKIE } from 'src/lib/marketplace-sso-crypto';

// ----------------------------------------------------------------------

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(MASTER_SESSION_COOKIE);
  clearLineFlowCookies(response);
  response.cookies.set(SSO_COOKIE, '', { ...ssoCookieOptions, maxAge: 0 });
  response.cookies.set(SSO_PENDING_COOKIE, '', { ...ssoCookieOptions, maxAge: 0 });
  return response;
}
