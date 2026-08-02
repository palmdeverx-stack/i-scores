import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  signAppToken,
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from 'src/lib/auth-token';

// ----------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MarketplaceSsoPayload = jwt.JwtPayload & {
  sub: string;
  jti: string;
};

function safeReturnTo(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null;
}

function homeForRole(role: string) {
  if (role === 'school_admin') return paths.admin.root;
  if (role === 'teacher') return paths.teacher.root;
  if (role === 'student') return paths.student.root;
  return paths.page403;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticket = url.searchParams.get('ticket') ?? '';
  const secret = process.env.MARKETPLACE_SSO_SECRET;
  if (!ticket || !secret) {
    return NextResponse.redirect(new URL(paths.page403, request.url));
  }

  let payload: MarketplaceSsoPayload;
  try {
    payload = jwt.verify(ticket, secret, {
      algorithms: ['HS256'],
      issuer: 'ekru-marketplace',
      audience: 'ekru-app',
    }) as MarketplaceSsoPayload;
  } catch {
    return NextResponse.redirect(new URL(paths.page403, request.url));
  }

  if (
    !UUID_PATTERN.test(payload.sub) ||
    !payload.jti ||
    !UUID_PATTERN.test(payload.jti) ||
    !payload.exp
  ) {
    return NextResponse.redirect(new URL(paths.page403, request.url));
  }

  const [{ data: appUsers }, { data: marketplaceUser }] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select(
        'id, username, role, school_id, is_active, school:schools!app_users_school_id_fkey(workspace_type, owner_auth_user_id)'
      )
      .eq('auth_user_id', payload.sub)
      .eq('is_active', true),
    supabaseAdmin
      .from('marketplace_users')
      .select('id, is_active')
      .eq('auth_user_id', payload.sub)
      .maybeSingle(),
  ]);
  const appUser = (appUsers ?? []).find((candidate) => {
    const school = Array.isArray(candidate.school) ? candidate.school[0] : candidate.school;
    return school?.workspace_type === 'personal' && school.owner_auth_user_id === payload.sub;
  }) ?? appUsers?.[0];
  if (!appUser?.is_active || !marketplaceUser?.is_active) {
    return NextResponse.redirect(new URL(paths.page403, request.url));
  }

  const { error: consumeError } = await supabaseAdmin
    .from('marketplace_sso_consumptions')
    .insert({
      jti: payload.jti,
      auth_user_id: payload.sub,
      expires_at: new Date(payload.exp * 1000).toISOString(),
    });
  if (consumeError) {
    return NextResponse.redirect(new URL(paths.page403, request.url));
  }

  const accessToken = signAppToken({
    sub: appUser.id,
    username: appUser.username,
    role: appUser.role,
    schoolId: appUser.school_id,
  });
  const destination =
    safeReturnTo(url.searchParams.get('returnTo')) ?? homeForRole(appUser.role);
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions);
  return response;
}
