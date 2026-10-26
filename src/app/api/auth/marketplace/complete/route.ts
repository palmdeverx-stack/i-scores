import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { isSignInAllowed } from 'src/lib/auth-rate-limit';
import { verifyStaffPinRequest } from 'src/lib/verify-staff-pin';
import {
  SSO_HEADERS,
  getSsoConfig,
  sameSsoOrigin,
  MarketplaceSsoError,
} from 'src/lib/marketplace-sso-crypto';
import {
  completeSso,
  readSsoPending,
  loadSsoProfile,
  ssoDestination,
  clearSsoCookie,
  loadSsoIdentity,
  verifyExistingSsoLinkSession,
} from 'src/lib/marketplace-sso';
import {
  signAppToken,
  verifyAppToken,
  getRequestToken,
  ACCESS_TOKEN_COOKIE,
  MASTER_SESSION_COOKIE,
  accessTokenCookieOptions,
  masterSessionCookieOptions,
} from 'src/lib/auth-token';

export async function POST(request: NextRequest) {
  try {
    const config = getSsoConfig();
    if (!sameSsoOrigin(request, config.origin))
      throw new MarketplaceSsoError('invalid_transaction', 403);
    const { data, identity } = await readSsoPending(request);
    const body = await request.json().catch(() => null);
    if (body?.action === 'switch-account' && data.kind === 'link') {
      const response = NextResponse.json(
        { redirectTo: '/auth/jwt/sign-in?returnTo=%2Fauth%2Fmarketplace%2Fcontinue' },
        { headers: SSO_HEADERS }
      );
      response.cookies.set(ACCESS_TOKEN_COOKIE, '', { ...accessTokenCookieOptions, maxAge: 0 });
      response.cookies.set(MASTER_SESSION_COOKIE, '', { ...masterSessionCookieOptions, maxAge: 0 });
      return response;
    }
    let profile;
    if (data.kind === 'pin') {
      if (
        body?.action !== 'pin' ||
        typeof data.challenge !== 'string' ||
        !/^\d{8}$/.test(String(body.pin ?? ''))
      )
        throw new MarketplaceSsoError('pin_required');
      const verified = await verifyStaffPinRequest(
        new Request(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({ pinChallengeToken: data.challenge, pin: body.pin }),
        })
      );
      if (!verified.ok) {
        for (const [name, value] of Object.entries(SSO_HEADERS)) verified.headers.set(name, value);
        return verified;
      }
      profile = await loadSsoProfile(identity);
      if (!profile) throw new MarketplaceSsoError('account_unavailable', 403);
      const destination = await ssoDestination(profile, data.returnTo);
      await completeSso(String(data.id), identity, 'pin', profile);
      const token = verified.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
      if (!token) throw new MarketplaceSsoError('service_unavailable', 503);
      const response = NextResponse.json({ redirectTo: destination }, { headers: SSO_HEADERS });
      response.cookies.set(ACCESS_TOKEN_COOKIE, token, accessTokenCookieOptions);
      clearSsoCookie(response, true);
      return response;
    }
    if (!(await isSignInAllowed(request, `marketplace-link:${identity.id}`)))
      throw new MarketplaceSsoError('rate_limited', 429);
    if (body?.action === 'create') {
      const created = await supabaseAdmin.rpc('create_marketplace_sso_buyer', {
        p_id: data.id,
        p_identity: identity.id,
      });
      if (created.error) throw new MarketplaceSsoError('identity_conflict', 409);
      profile = await loadSsoProfile(await loadSsoIdentity({ id: identity.id }));
    } else if (body?.action === 'link') {
      const token = getRequestToken(request);
      const caller = token ? verifyAppToken(token) : null;
      profile = await verifyExistingSsoLinkSession(caller);
      // Linking an administrator is allowed only from their already-authenticated E-KRU session (including its PIN).
      const destination = await ssoDestination(profile, data.returnTo);
      await completeSso(String(data.id), identity, 'link', profile);
      const response = NextResponse.json({ redirectTo: destination }, { headers: SSO_HEADERS });
      clearSsoCookie(response, true);
      return response;
    } else throw new MarketplaceSsoError('invalid_transaction');
    if (!profile || profile.role !== 'marketplace_user')
      throw new MarketplaceSsoError('account_unavailable', 403);
    const destination = await ssoDestination(profile, data.returnTo);
    const response = NextResponse.json({ redirectTo: destination }, { headers: SSO_HEADERS });
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      signAppToken({
        sub: profile.id,
        username: profile.username,
        role: 'marketplace_user',
        schoolId: null,
        authProvider: 'marketplace',
        marketplaceIdentityId: identity.id,
      }),
      accessTokenCookieOptions
    );
    clearSsoCookie(response, true);
    return response;
  } catch (error) {
    return NextResponse.json(
      { code: error instanceof MarketplaceSsoError ? error.code : 'service_unavailable' },
      { status: error instanceof MarketplaceSsoError ? error.status : 503, headers: SSO_HEADERS }
    );
  }
}
