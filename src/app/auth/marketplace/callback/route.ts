import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  signAppToken,
  signPinChallenge,
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from 'src/lib/auth-token';
import {
  completeSso,
  loadSsoProfile,
  ssoDestination,
  clearSsoCookie,
  exchangeMarketplaceCode,
  resolveMarketplaceIdentity,
} from 'src/lib/marketplace-sso';
import {
  ssoHash,
  SSO_COOKIE,
  ssoMatches,
  SSO_HEADERS,
  getSsoConfig,
  openSsoCookie,
  sealSsoCookie,
  ssoCookieOptions,
  SSO_PENDING_COOKIE,
  MarketplaceSsoError,
} from 'src/lib/marketplace-sso-crypto';

export async function GET(request: NextRequest) {
  try {
    const config = getSsoConfig();
    if (request.nextUrl.origin !== config.origin) throw new MarketplaceSsoError('wrong_origin');
    const tx = openSsoCookie(request.cookies.get(SSO_COOKIE)?.value);
    const state = request.nextUrl.searchParams.get('state') ?? '';
    const code = request.nextUrl.searchParams.get('code') ?? '';
    if (
      tx.kind !== 'oauth' ||
      typeof tx.id !== 'string' ||
      typeof tx.state !== 'string' ||
      typeof tx.verifier !== 'string' ||
      !/^[-A-Za-z0-9_]{43}$/.test(state) ||
      !ssoMatches(state, tx.state) ||
      !code ||
      code.length > 2048
    )
      throw new MarketplaceSsoError('invalid_transaction', 401);
    const claim = await supabaseAdmin.rpc('claim_marketplace_sso', {
      p_id: tx.id,
      p_state: ssoHash(state),
      p_code: ssoHash(code),
    });
    if (claim.error || !claim.data?.length)
      throw new MarketplaceSsoError('invalid_transaction', 401);
    const remote = await exchangeMarketplaceCode(code, tx.verifier);
    const identity = await resolveMarketplaceIdentity(remote);
    const profile = await loadSsoProfile(identity);
    const kind = !profile
      ? 'link'
      : ['master_admin', 'school_admin'].includes(profile.role)
        ? 'pin'
        : null;
    const saved = await supabaseAdmin
      .from('marketplace_sso_transactions')
      .update({ identity_id: identity.id, pending_kind: kind })
      .eq('id', tx.id);
    if (saved.error) throw new MarketplaceSsoError('service_unavailable', 503);
    if (kind) {
      const challenge =
        kind === 'pin' && profile ? signPinChallenge(profile.id, 'marketplace', identity.id) : null;
      const response = NextResponse.redirect(new URL('/auth/marketplace/continue', config.origin), {
        headers: SSO_HEADERS,
      });
      response.cookies.set(
        SSO_PENDING_COOKIE,
        sealSsoCookie(
          { kind, id: tx.id, identityId: identity.id, challenge, returnTo: tx.returnTo },
          Number(tx.expiresAt)
        ),
        {
          ...ssoCookieOptions,
          maxAge: Math.max(0, Math.floor((Number(tx.expiresAt) - Date.now()) / 1000)),
        }
      );
      clearSsoCookie(response);
      return response;
    }
    if (!profile) throw new MarketplaceSsoError('account_unavailable', 403);
    const destination = await ssoDestination(profile, tx.returnTo);
    await completeSso(tx.id, identity, null, profile);
    const response = NextResponse.redirect(new URL(destination, config.origin), {
      headers: SSO_HEADERS,
    });
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      signAppToken({
        sub: profile.id,
        username: profile.username,
        role: profile.role,
        schoolId: profile.school_id,
        authProvider: 'marketplace',
        marketplaceIdentityId: identity.id,
      }),
      accessTokenCookieOptions
    );
    clearSsoCookie(response, true);
    return response;
  } catch (error) {
    const target = new URL('/auth/marketplace/continue', request.url);
    target.searchParams.set(
      'error',
      error instanceof MarketplaceSsoError ? error.code : 'service_unavailable'
    );
    const response = NextResponse.redirect(target, { headers: SSO_HEADERS });
    clearSsoCookie(response, true);
    return response;
  }
}
