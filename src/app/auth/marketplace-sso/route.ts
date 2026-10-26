import { NextResponse } from 'next/server';

import { SSO_HEADERS } from 'src/lib/marketplace-sso-crypto';

import { safeInternalPath } from 'src/auth/utils/safe-internal-path';
/** Legacy tickets are no longer accepted; start a fresh browser-bound code flow. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL('/auth/marketplace/start', url.origin);
  const returnTo = safeInternalPath(url.searchParams.get('returnTo'));
  if (returnTo) target.searchParams.set('returnTo', returnTo);
  return NextResponse.redirect(target, { headers: SSO_HEADERS });
}
