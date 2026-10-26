import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';

import { createHash, randomBytes } from 'node:crypto';

import { supabaseAdmin } from './supabase-admin';
import { getSessionStatus } from './session-security';
import { requireRole, getRequestToken } from './auth-token';
import { isSchoolAccessUsable } from './school-subscription';
import {
  LINE_STATE_COOKIE,
  LINE_BROWSER_COOKIE,
  lineFlowCookieOptions,
} from './line-login-cookies';

export class LineLoginError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
  }
}
export function getLineLoginConfig() {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
  if (!channelId || !liffId) return null;
  if (
    !/^\d+$/.test(channelId) ||
    !/^[0-9]+-[A-Za-z0-9_-]+$/.test(liffId) ||
    !liffId.startsWith(`${channelId}-`)
  )
    throw new LineLoginError('not_configured', 503);
  return { channelId, liffId };
}

/** Use the current E-KRU origin; never redirect to the Marketplace origin. */
export function lineRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}
export function lineDigest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export function lineSecret() {
  return randomBytes(32).toString('base64url');
}
export function lineSameOrigin(request: Request, origin: string) {
  return (
    request.headers.get('origin') === origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
export function lineFlowSecrets(request: NextRequest) {
  const state = request.cookies.get(LINE_STATE_COOKIE)?.value ?? '';
  const browser = request.cookies.get(LINE_BROWSER_COOKIE)?.value ?? '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(browser))
    throw new LineLoginError('invalid_state');
  return { state, browser, stateHash: lineDigest(state), browserHash: lineDigest(browser) };
}
export function clearLineFlowCookies(response: NextResponse) {
  response.cookies.set(LINE_STATE_COOKIE, '', { ...lineFlowCookieOptions, maxAge: 0 });
  response.cookies.set(LINE_BROWSER_COOKIE, '', { ...lineFlowCookieOptions, maxAge: 0 });
}
/** LIFF manages its own OIDC login. Accept only a raw ID token, never decoded profile data. */
export async function verifyLineIdToken(
  config: NonNullable<ReturnType<typeof getLineLoginConfig>>,
  idToken: string
) {
  if (typeof idToken !== 'string' || !idToken || idToken.length > 16384)
    throw new LineLoginError('line_verification_failed', 401);
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: config.channelId }),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new LineLoginError('line_verification_failed', 401);
  const claims = await response.json();
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss !== 'https://access.line.me' ||
    claims.aud !== config.channelId ||
    typeof claims.exp !== 'number' ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    typeof claims.iat !== 'number' ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now + 60 ||
    typeof claims.sub !== 'string' ||
    !/^[A-Za-z0-9_-]{1,255}$/.test(claims.sub)
  )
    throw new LineLoginError('line_verification_failed', 401);
  return {
    subject: claims.sub as string,
    displayName: typeof claims.name === 'string' ? claims.name.slice(0, 200) : '',
  };
}
export async function eligibleLineTeacher(userId: string) {
  const result = await supabaseAdmin
    .from('app_users')
    .select('id,username,role,school_id,is_active,must_change_password')
    .eq('id', userId)
    .maybeSingle();
  if (result.error) throw new LineLoginError('service_unavailable', 503);
  const user = result.data;
  if (!user || user.role !== 'teacher' || user.is_active !== true || !user.school_id)
    throw new LineLoginError('account_unavailable', 403);
  const school = await supabaseAdmin
    .from('schools')
    .select('is_active')
    .eq('id', user.school_id)
    .maybeSingle();
  if (school.error) throw new LineLoginError('service_unavailable', 503);
  if (!school.data?.is_active) throw new LineLoginError('school_unavailable', 403);
  if (!(await isSchoolAccessUsable(user.school_id, { userId: user.id, role: 'teacher' })))
    throw new LineLoginError('license_unavailable', 403);
  return user;
}
export async function requireLineLinkSession(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId || caller.impersonatedBy || caller.authProvider === 'line')
    throw new LineLoginError('existing_login_required', 403);
  const status = await getSessionStatus(caller);
  if (status !== 'active')
    throw new LineLoginError(
      status === 'error' ? 'service_unavailable' : 'existing_login_required',
      status === 'error' ? 503 : 403
    );
  const user = await eligibleLineTeacher(caller.sub);
  if (user.school_id !== caller.schoolId) throw new LineLoginError('session_changed', 403);
  if (user.must_change_password) throw new LineLoginError('password_change_required', 403);
  return { caller, user, sessionHash: lineDigest(getRequestToken(request)!) };
}
