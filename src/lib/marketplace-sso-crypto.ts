import 'server-only';

import {
  hkdfSync,
  createHash,
  randomBytes,
  createCipheriv,
  timingSafeEqual,
  createDecipheriv,
} from 'node:crypto';

export const SSO_ISSUER = 'https://e-kru-marketplace.com';
export const SSO_CALLBACK = 'https://e-kru.com/auth/marketplace/callback';
export const SSO_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-ekru_marketplace_sso' : 'ekru_marketplace_sso';
export const SSO_PENDING_COOKIE =
  process.env.NODE_ENV === 'production'
    ? '__Host-ekru_marketplace_pending'
    : 'ekru_marketplace_pending';
export const SSO_HEADERS = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
export const ssoCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 300,
};
export class MarketplaceSsoError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
  }
}
export function getSsoConfig() {
  const secret = process.env.MARKETPLACE_SSO_SECRET;
  if (!secret || secret.trim().length < 32) throw new MarketplaceSsoError('not_configured', 503);
  const callback =
    process.env.NODE_ENV !== 'production' && process.env.MARKETPLACE_SSO_DEV_CALLBACK_URL
      ? process.env.MARKETPLACE_SSO_DEV_CALLBACK_URL
      : SSO_CALLBACK;
  const url = new URL(callback);
  if (
    url.pathname !== '/auth/marketplace/callback' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    (url.href !== SSO_CALLBACK &&
      !(
        process.env.NODE_ENV !== 'production' &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      ))
  )
    throw new MarketplaceSsoError('not_configured', 503);
  return { secret, callback: url.href, origin: url.origin };
}
export function ssoSecret() {
  return randomBytes(32).toString('base64url');
}
export function ssoHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export function ssoChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}
export function ssoMatches(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function key() {
  if (!process.env.AUTH_JWT_SECRET) throw new MarketplaceSsoError('not_configured', 503);
  return Buffer.from(
    hkdfSync('sha256', process.env.AUTH_JWT_SECRET, 'ekru-marketplace-sso', 'cookie-v1', 32)
  );
}
export function sealSsoCookie(value: Record<string, unknown>, expiresAt = Date.now() + 300000) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from('ekru-marketplace-sso:v1'));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ ...value, expiresAt }), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function openSsoCookie(raw: string | undefined): Record<string, unknown> {
  try {
    if (!raw || raw.length > 6000) throw new Error();
    const data = Buffer.from(raw, 'base64url');
    if (data.length < 29) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
    decipher.setAAD(Buffer.from('ekru-marketplace-sso:v1'));
    decipher.setAuthTag(data.subarray(12, 28));
    const value = JSON.parse(
      Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8')
    );
    if (
      !value ||
      typeof value.expiresAt !== 'number' ||
      value.expiresAt <= Date.now() ||
      value.expiresAt > Date.now() + 300000
    )
      throw new Error();
    return value;
  } catch {
    throw new MarketplaceSsoError('invalid_transaction', 401);
  }
}
export function sameSsoOrigin(request: Request, origin: string) {
  return (
    request.headers.get('origin') === origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
