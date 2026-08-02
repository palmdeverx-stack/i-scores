import 'server-only';

import { isIP } from 'node:net';
import crypto from 'node:crypto';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

const IP_MAX_ATTEMPTS = 20;
const IP_WINDOW_SECONDS = 60;
const USERNAME_MAX_ATTEMPTS = 5;
const USERNAME_WINDOW_SECONDS = 60;
export const AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS = Math.max(
  IP_WINDOW_SECONDS,
  USERNAME_WINDOW_SECONDS
);

function firstValidIp(headerValue: string | null): string | null {
  const candidate = headerValue?.split(',')[0]?.trim() ?? '';
  return isIP(candidate) ? candidate : null;
}

export function getClientIp(request: Request): string {
  // Vercel documents this as identical to x-forwarded-for, but it remains
  // authoritative when another proxy is placed in front of Vercel.
  return (
    firstValidIp(request.headers.get('x-vercel-forwarded-for')) ??
    firstValidIp(request.headers.get('x-forwarded-for')) ??
    'unknown'
  );
}

function rateLimitIdentifier(scope: 'ip' | 'user', value: string): string {
  const digest = crypto.createHash('sha256').update(`${scope}:${value}`).digest('hex');
  return `v1:${scope}:${digest}`;
}

async function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error('Rate limit check failed', error);
    return false;
  }

  return data as boolean;
}

/**
 * Fails closed on infrastructure errors. Authentication must not continue
 * when brute-force protection cannot make an authoritative decision.
 */
export async function isSignInAllowed(request: Request, username: string): Promise<boolean> {
  const ip = getClientIp(request);
  const normalizedUsername = username.trim().slice(0, 320).toLowerCase();

  const [ipAllowed, usernameAllowed] = await Promise.all([
    checkRateLimit(rateLimitIdentifier('ip', ip), IP_MAX_ATTEMPTS, IP_WINDOW_SECONDS),
    checkRateLimit(
      rateLimitIdentifier('user', normalizedUsername),
      USERNAME_MAX_ATTEMPTS,
      USERNAME_WINDOW_SECONDS
    ),
  ]);

  return ipAllowed && usernameAllowed;
}
