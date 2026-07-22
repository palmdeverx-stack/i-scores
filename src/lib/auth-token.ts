import 'server-only';

import jwt from 'jsonwebtoken';

// ----------------------------------------------------------------------

const rawSecret = process.env.AUTH_JWT_SECRET;

if (!rawSecret) {
  throw new Error('Missing AUTH_JWT_SECRET environment variable');
}

const secret: string = rawSecret;

export type AppRole = 'master_admin' | 'school_admin' | 'teacher' | 'student';

export type AppTokenPayload = {
  sub: string;
  username: string;
  role: AppRole;
  schoolId: string | null;
};

export function signAppToken(payload: AppTokenPayload): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyAppToken(token: string): AppTokenPayload | null {
  try {
    return jwt.verify(token, secret) as AppTokenPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  return request.headers.get('authorization')?.replace('Bearer ', '') ?? null;
}

/** Returns the caller's token payload if it's authenticated and has one of `roles`, else null. */
export function requireRole(request: Request, roles: AppRole[]): AppTokenPayload | null {
  const token = getBearerToken(request);
  const payload = token ? verifyAppToken(token) : null;

  return payload && roles.includes(payload.role) ? payload : null;
}

type AppUserRow = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  school_id: string | null;
  created_at: string;
  must_change_password?: boolean;
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
    created_at: user.created_at,
    must_change_password: user.must_change_password ?? false,
  };
}
