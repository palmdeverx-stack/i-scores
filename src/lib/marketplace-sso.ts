import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';
import type { SessionRole, AppTokenPayload } from './auth-token';

import { getHomePathForRole } from 'src/auth/utils/role-home-path';
import { safeInternalPath } from 'src/auth/utils/safe-internal-path';

import { supabaseAdmin } from './supabase-admin';
import { getSessionStatus } from './session-security';
import { resolveEkruAppAccess } from './ekru-app-access';
import { isSchoolAccessUsable } from './school-subscription';
import {
  SSO_ISSUER,
  SSO_COOKIE,
  getSsoConfig,
  openSsoCookie,
  ssoCookieOptions,
  SSO_PENDING_COOKIE,
  MarketplaceSsoError,
} from './marketplace-sso-crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type SsoIdentity = {
  id: string;
  issuer: string;
  subject: string;
  remote_user_id: string;
  account_type: string;
  display_name: string;
  app_user_id: string | null;
  marketplace_user_id: string | null;
  is_active: boolean;
};
export type SsoProfile = {
  id: string;
  username: string;
  role: SessionRole;
  school_id: string | null;
};
export async function exchangeMarketplaceCode(code: string, verifier: string) {
  const config = getSsoConfig();
  const response = await fetch(`${SSO_ISSUER}/api/sso/exchange`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: config.callback }),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new MarketplaceSsoError('exchange_failed', 401);
  const value = await response.json();
  const text = (v: unknown, max: number) =>
    typeof v === 'string' &&
    v.length > 0 &&
    v.length <= max &&
    ![...v].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
  if (
    !value ||
    value.issuer !== SSO_ISSUER ||
    !text(value.subject, 255) ||
    !text(value.account_type, 60) ||
    !text(value.user_id, 255) ||
    (value.auth_user_id != null &&
      (typeof value.auth_user_id !== 'string' || !UUID.test(value.auth_user_id)))
  )
    throw new MarketplaceSsoError('invalid_identity', 401);
  if (value.is_active === false || ['suspended', 'disabled', 'banned'].includes(value.status))
    throw new MarketplaceSsoError('account_unavailable', 403);
  return {
    issuer: SSO_ISSUER,
    subject: value.subject as string,
    userId: value.user_id as string,
    authUserId: (value.auth_user_id ?? null) as string | null,
    accountType: value.account_type as string,
    displayName: [value.first_name, value.last_name]
      .filter((v) => typeof v === 'string')
      .join(' ')
      .slice(0, 200),
  };
}
/** Explicit deployment assertion, never inferred from a matching UUID, email or name. */
export function hasSharedMarketplaceProject() {
  const source = process.env.MARKETPLACE_SSO_SHARED_SUPABASE_URL;
  const local = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!source || !local) return false;
  try {
    const a = new URL(source);
    const b = new URL(local);
    return (
      a.protocol === 'https:' &&
      a.origin === b.origin &&
      a.pathname.replace(/\/$/, '') === '' &&
      b.pathname.replace(/\/$/, '') === '' &&
      !a.search &&
      !a.hash &&
      !a.username &&
      !a.password
    );
  } catch {
    return false;
  }
}
export async function resolveMarketplaceIdentity(
  remote: Awaited<ReturnType<typeof exchangeMarketplaceCode>>
) {
  const inserted = await supabaseAdmin.from('marketplace_sso_identities').upsert(
    {
      issuer: remote.issuer,
      subject: remote.subject,
      remote_user_id: remote.userId,
      account_type: remote.accountType,
      display_name: remote.displayName,
    },
    { onConflict: 'issuer,subject', ignoreDuplicates: true }
  );
  if (inserted.error) throw new MarketplaceSsoError('service_unavailable', 503);
  let identity = await loadSsoIdentity({ issuer: remote.issuer, subject: remote.subject });
  if (identity.remote_user_id !== remote.userId)
    throw new MarketplaceSsoError('identity_conflict', 409);
  if (identity.app_user_id || identity.marketplace_user_id) return identity;
  const sharedProject = hasSharedMarketplaceProject();
  if (sharedProject && remote.authUserId) {
    const result = await supabaseAdmin.auth.admin.getUserById(remote.authUserId);
    if (result.error || !result.data.user || result.data.user.id !== remote.authUserId)
      throw new MarketplaceSsoError('invalid_identity', 401);
    const bannedUntil = (result.data.user as unknown as { banned_until?: unknown }).banned_until;
    if (typeof bannedUntil === 'string' && new Date(bannedUntil).getTime() > Date.now())
      throw new MarketplaceSsoError('account_unavailable', 403);
  }
  // user_id is the trusted issuer's Marketplace buyer identifier, never an E-KRU staff id.
  // Only the auth_user_id fallback requires an explicitly confirmed shared Auth project.
  let buyer = null;
  if (UUID.test(remote.userId)) {
    const result = await supabaseAdmin
      .from('marketplace_users')
      .select('id,auth_user_id,is_active')
      .eq('id', remote.userId)
      .maybeSingle();
    if (result.error) throw new MarketplaceSsoError('service_unavailable', 503);
    buyer = result.data;
    if (
      sharedProject &&
      remote.authUserId &&
      buyer?.auth_user_id &&
      buyer.auth_user_id !== remote.authUserId
    )
      throw new MarketplaceSsoError('identity_conflict', 409);
  }
  if (!buyer && sharedProject && remote.authUserId) {
    const result = await supabaseAdmin
      .from('marketplace_users')
      .select('id,auth_user_id,is_active')
      .eq('auth_user_id', remote.authUserId)
      .maybeSingle();
    if (result.error) throw new MarketplaceSsoError('service_unavailable', 503);
    buyer = result.data;
  }
  if (!buyer) return identity;
  if (!buyer.is_active) throw new MarketplaceSsoError('account_unavailable', 403);
  const bound = await supabaseAdmin
    .from('marketplace_sso_identities')
    .update({ marketplace_user_id: buyer.id })
    .eq('id', identity.id)
    .is('app_user_id', null)
    .is('marketplace_user_id', null);
  if (bound.error) throw new MarketplaceSsoError('service_unavailable', 503);
  identity = await loadSsoIdentity({ id: identity.id });
  return identity;
}
export async function loadSsoIdentity(key: {
  id?: string;
  issuer?: string;
  subject?: string;
}): Promise<SsoIdentity> {
  let query = supabaseAdmin.from('marketplace_sso_identities').select('*');
  query = key.id
    ? query.eq('id', key.id)
    : query.eq('issuer', key.issuer).eq('subject', key.subject);
  const result = await query.maybeSingle();
  if (result.error) throw new MarketplaceSsoError('service_unavailable', 503);
  if (!result.data?.is_active) throw new MarketplaceSsoError('account_unavailable', 403);
  return result.data as SsoIdentity;
}
export async function loadSsoProfile(identity: SsoIdentity): Promise<SsoProfile | null> {
  const buyer = !!identity.marketplace_user_id;
  const id = buyer ? identity.marketplace_user_id : identity.app_user_id;
  if (!id) return null;
  const result = await supabaseAdmin
    .from(buyer ? 'marketplace_users' : 'app_users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (result.error) throw new MarketplaceSsoError('service_unavailable', 503);
  const user = result.data;
  if (!user?.is_active) throw new MarketplaceSsoError('account_unavailable', 403);
  if (buyer)
    return { id: user.id, username: user.username, role: 'marketplace_user', school_id: null };
  if (
    !['master_admin', 'school_admin', 'teacher', 'student'].includes(user.role) ||
    (user.role === 'student' && (user.student_status ?? 'studying') !== 'studying')
  )
    throw new MarketplaceSsoError('account_unavailable', 403);
  if (user.role !== 'master_admin') {
    if (!user.school_id) throw new MarketplaceSsoError('school_unavailable', 403);
    const school = await supabaseAdmin
      .from('schools')
      .select('is_active')
      .eq('id', user.school_id)
      .maybeSingle();
    if (school.error) throw new MarketplaceSsoError('service_unavailable', 503);
    if (!school.data?.is_active) throw new MarketplaceSsoError('school_unavailable', 403);
    if (!(await isSchoolAccessUsable(user.school_id, { userId: user.id, role: user.role })))
      throw new MarketplaceSsoError('license_unavailable', 403);
  }
  return user as SsoProfile;
}
export async function ssoDestination(profile: SsoProfile, returnTo: unknown) {
  const path = safeInternalPath(returnTo) ?? getHomePathForRole(profile.role);
  const url = new URL(path, 'https://e-kru.com');
  const appPath = url.pathname.replace(/\/$/, '');
  if (appPath === '/launch' || appPath.startsWith('/apps/')) {
    const caller: AppTokenPayload = {
      sub: profile.id,
      username: profile.username,
      role: profile.role,
      schoolId: profile.school_id,
      iat: Math.floor(Date.now() / 1000),
    };
    const access = await resolveEkruAppAccess(
      caller,
      appPath === '/launch' ? { code: url.searchParams.get('app') ?? '' } : { launchPath: appPath }
    );
    if (!access.allowed) throw new MarketplaceSsoError('license_unavailable', 403);
  } else if (
    profile.role === 'marketplace_user' &&
    /^\/(master|admin|teacher|student)(\/|$)/.test(appPath)
  )
    return getHomePathForRole(profile.role);
  return path;
}
export function clearSsoCookie(response: NextResponse, pending = false) {
  response.cookies.set(SSO_COOKIE, '', { ...ssoCookieOptions, maxAge: 0 });
  if (pending) response.cookies.set(SSO_PENDING_COOKIE, '', { ...ssoCookieOptions, maxAge: 0 });
}
export async function readSsoPending(request: NextRequest) {
  const data = openSsoCookie(request.cookies.get(SSO_PENDING_COOKIE)?.value);
  if (
    !['link', 'pin'].includes(String(data.kind)) ||
    typeof data.id !== 'string' ||
    !UUID.test(data.id) ||
    typeof data.identityId !== 'string' ||
    !UUID.test(data.identityId)
  )
    throw new MarketplaceSsoError('invalid_transaction', 401);
  const result = await supabaseAdmin
    .from('marketplace_sso_transactions')
    .select('id')
    .eq('id', data.id)
    .eq('identity_id', data.identityId)
    .eq('pending_kind', data.kind)
    .is('completed_at', null)
    .not('claimed_at', 'is', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (result.error) throw new MarketplaceSsoError('service_unavailable', 503);
  if (!result.data) throw new MarketplaceSsoError('invalid_transaction', 401);
  const identity = await loadSsoIdentity({ id: data.identityId });
  return { data, identity };
}
export async function completeSso(
  id: string,
  identity: SsoIdentity,
  kind: string | null,
  profile: SsoProfile
) {
  const result = await supabaseAdmin.rpc('complete_marketplace_sso', {
    p_id: id,
    p_identity: identity.id,
    p_kind: kind,
    p_app: profile.role === 'marketplace_user' ? null : profile.id,
    p_buyer: profile.role === 'marketplace_user' ? profile.id : null,
  });
  if (result.error) throw new MarketplaceSsoError('invalid_transaction', 409);
}
export async function verifyExistingSsoLinkSession(caller: AppTokenPayload | null) {
  if (!caller || caller.impersonatedBy || caller.authProvider === 'marketplace')
    throw new MarketplaceSsoError('existing_login_required', 403);
  const status = await getSessionStatus(caller);
  if (status !== 'active')
    throw new MarketplaceSsoError(
      status === 'error' ? 'service_unavailable' : 'existing_login_required',
      status === 'error' ? 503 : 403
    );
  const identity = {
    app_user_id: caller.role === 'marketplace_user' ? null : caller.sub,
    marketplace_user_id: caller.role === 'marketplace_user' ? caller.sub : null,
  } as SsoIdentity;
  const profile = await loadSsoProfile(identity);
  if (!profile) throw new MarketplaceSsoError('account_unavailable', 403);
  if (profile.school_id !== caller.schoolId || profile.role !== caller.role)
    throw new MarketplaceSsoError('existing_login_required', 403);
  const user =
    caller.role === 'marketplace_user'
      ? null
      : await supabaseAdmin
          .from('app_users')
          .select('must_change_password')
          .eq('id', caller.sub)
          .maybeSingle();
  if (user?.error) throw new MarketplaceSsoError('service_unavailable', 503);
  if (user?.data?.must_change_password)
    throw new MarketplaceSsoError('existing_login_required', 403);
  return profile;
}
