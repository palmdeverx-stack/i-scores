import type { NextRequest } from 'next/server';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { getClientIp, isSignInAllowed } from 'src/lib/auth-rate-limit';
import {
  ssoHash,
  ssoSecret,
  SSO_ISSUER,
  SSO_COOKIE,
  SSO_HEADERS,
  getSsoConfig,
  ssoChallenge,
  sealSsoCookie,
  ssoCookieOptions,
  SSO_PENDING_COOKIE,
  MarketplaceSsoError,
} from 'src/lib/marketplace-sso-crypto';

import { safeInternalPath } from 'src/auth/utils/safe-internal-path';

export async function GET(request: NextRequest) {
  try {
    const config = getSsoConfig();
    if (request.nextUrl.origin !== config.origin) throw new MarketplaceSsoError('wrong_origin');
    if (!(await isSignInAllowed(request, `marketplace-sso:${getClientIp(request)}`)))
      throw new MarketplaceSsoError('rate_limited', 429);
    const raw = request.nextUrl.searchParams.get('returnTo');
    const returnTo = safeInternalPath(raw);
    if (raw && !returnTo) throw new MarketplaceSsoError('invalid_destination');
    const state = ssoSecret();
    const verifier = ssoSecret();
    const id = randomUUID();
    const expiresAt = Date.now() + 300000;
    const result = await supabaseAdmin
      .from('marketplace_sso_transactions')
      .insert({ id, state_hash: ssoHash(state), expires_at: new Date(expiresAt).toISOString() });
    if (result.error) throw new MarketplaceSsoError('service_unavailable', 503);
    const authorize = new URL('/api/sso/authorize', SSO_ISSUER);
    authorize.search = new URLSearchParams({
      state,
      code_challenge: ssoChallenge(verifier),
      code_challenge_method: 'S256',
      redirect_uri: config.callback,
    }).toString();
    const response = NextResponse.redirect(authorize, { headers: SSO_HEADERS });
    response.cookies.set(
      SSO_COOKIE,
      sealSsoCookie({ kind: 'oauth', id, state, verifier, returnTo }, expiresAt),
      ssoCookieOptions
    );
    response.cookies.set(SSO_PENDING_COOKIE, '', { ...ssoCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json(
      { code: error instanceof MarketplaceSsoError ? error.code : 'service_unavailable' },
      { status: error instanceof MarketplaceSsoError ? error.status : 503, headers: SSO_HEADERS }
    );
  }
}
