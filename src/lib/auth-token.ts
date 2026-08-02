import 'server-only';

import jwt, { type JwtPayload } from 'jsonwebtoken';

// ----------------------------------------------------------------------

const rawSecret = process.env.AUTH_JWT_SECRET;

if (!rawSecret) {
  throw new Error('Missing AUTH_JWT_SECRET environment variable');
}

const secret: string = rawSecret;
const pinChallengeSecret = `${secret}:pin-challenge`;

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const MASTER_SESSION_COOKIE = 'master_access_token';
const ACCESS_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_ROLES: readonly SessionRole[] = [
  'master_admin',
  'school_admin',
  'teacher',
  'student',
  'marketplace_user',
];

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
};

export const masterSessionCookieOptions = {
  ...accessTokenCookieOptions,
  maxAge: 2 * 60 * 60,
};

export type AppRole = 'master_admin' | 'school_admin' | 'teacher' | 'student';
export type SessionRole = AppRole | 'marketplace_user';

export type AppTokenPayload = {
  sub: string;
  username: string;
  role: SessionRole;
  schoolId: string | null;
  impersonatedBy?: string;
  impersonationAuditId?: string;
  previewAllFeatures?: boolean;
  iat?: number;
  exp?: number;
};

type PinChallengePayload = {
  sub: string;
  purpose: 'pin_verification';
};

export function signAppToken(payload: AppTokenPayload): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function isAppTokenPayload(payload: string | JwtPayload): payload is AppTokenPayload & JwtPayload {
  return (
    typeof payload !== 'string' &&
    typeof payload.sub === 'string' &&
    UUID_PATTERN.test(payload.sub) &&
    typeof payload.username === 'string' &&
    typeof payload.role === 'string' &&
    SESSION_ROLES.includes(payload.role as SessionRole) &&
    (payload.schoolId === null ||
      (typeof payload.schoolId === 'string' && UUID_PATTERN.test(payload.schoolId))) &&
    (payload.impersonatedBy === undefined ||
      (typeof payload.impersonatedBy === 'string' && UUID_PATTERN.test(payload.impersonatedBy))) &&
    (payload.impersonationAuditId === undefined ||
      (typeof payload.impersonationAuditId === 'string' &&
        UUID_PATTERN.test(payload.impersonationAuditId)))
  );
}

export function verifyAppToken(token: string): AppTokenPayload | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return isAppTokenPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function signPinChallenge(userId: string): string {
  return jwt.sign({ sub: userId, purpose: 'pin_verification' }, pinChallengeSecret, {
    expiresIn: '5m',
  });
}

export function verifyPinChallenge(token: string): PinChallengePayload | null {
  try {
    const payload = jwt.verify(token, pinChallengeSecret, { algorithms: ['HS256'] });
    return typeof payload !== 'string' &&
      payload.purpose === 'pin_verification' &&
      typeof payload.sub === 'string' &&
      UUID_PATTERN.test(payload.sub)
      ? (payload as PinChallengePayload)
      : null;
  } catch {
    return null;
  }
}

function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    if (part.slice(0, separatorIndex).trim() === name) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return null;
}

/** The access token lives in an httpOnly cookie — never in a client-readable header or storage. */
export function getRequestToken(request: Request): string | null {
  return getCookieValue(request, ACCESS_TOKEN_COOKIE);
}

export function getMasterSessionToken(request: Request): string | null {
  return getCookieValue(request, MASTER_SESSION_COOKIE);
}

/** Returns the caller's token payload if it's authenticated and has one of `roles`, else null. */
export function requireRole<T extends SessionRole>(
  request: Request,
  roles: T[]
): (AppTokenPayload & { role: T }) | null {
  const token = getRequestToken(request);
  const payload = token ? verifyAppToken(token) : null;

  if (
    payload?.impersonatedBy &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())
  ) {
    return null;
  }

  return payload && roles.includes(payload.role as T)
    ? (payload as AppTokenPayload & { role: T })
    : null;
}

type AppUserRow = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  school_id: string | null;
  avatar_url?: string | null;
  created_at: string;
  must_change_password?: boolean;
  is_active?: boolean;
  accepted_legal_at?: string | null;
  is_school_director?: boolean;
  staff_type?: string | null;
  position_title?: string | null;
  employment_status?: string | null;
};

export function toPublicUser(user: AppUserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    school_id: user.school_id,
    avatar_url: user.avatar_url ?? null,
    photoURL: user.avatar_url ?? null,
    created_at: user.created_at,
    must_change_password: user.must_change_password ?? false,
    is_active: user.is_active ?? true,
    accepted_legal_at: user.accepted_legal_at ?? null,
    is_school_director: user.is_school_director ?? false,
    staff_type: user.staff_type ?? null,
    position_title: user.position_title ?? null,
    employment_status: user.employment_status ?? null,
  };
}
