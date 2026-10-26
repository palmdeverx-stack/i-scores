import 'server-only';

import { request as httpsRequest } from 'node:https';

import { LineLoginError, type getLineLoginConfig } from './line-login';

// LINE requires the access token in this verification URL. Use a bounded HTTPS
// request instead of instrumented fetch so the token is not written to Next fetch logs.
function lineJson(
  url: URL,
  headers: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new LineLoginError('line_verification_failed', 401));
    const request = httpsRequest(
      url,
      { method: 'GET', headers, signal: AbortSignal.timeout(10000) },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          fail();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 65536) {
            request.destroy();
            fail();
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        response.on('error', fail);
        response.on('end', () => {
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (!value || typeof value !== 'object' || Array.isArray(value)) {
              fail();
              return;
            }
            resolve(value);
          } catch {
            fail();
          }
        });
      }
    );
    request.on('error', fail);
    request.end();
  });
}

export async function verifyLineAccessToken(
  config: NonNullable<ReturnType<typeof getLineLoginConfig>>,
  accessToken: string
) {
  if (
    typeof accessToken !== 'string' ||
    !accessToken ||
    accessToken.length > 16384 ||
    /[^\x21-\x7e]/.test(accessToken)
  )
    throw new LineLoginError('line_verification_failed', 401);
  const url = new URL('https://api.line.me/oauth2/v2.1/verify');
  url.searchParams.set('access_token', accessToken);
  const verified = await lineJson(url);
  if (
    verified.client_id !== config.channelId ||
    typeof verified.expires_in !== 'number' ||
    !Number.isFinite(verified.expires_in) ||
    verified.expires_in <= 0
  )
    throw new LineLoginError('line_verification_failed', 401);
  if (typeof verified.scope !== 'string' || !verified.scope.split(/\s+/).includes('profile'))
    throw new LineLoginError('profile_permission_required', 403);
  const profile = await lineJson(new URL('https://api.line.me/v2/profile'), {
    Authorization: `Bearer ${accessToken}`,
  });
  if (typeof profile.userId !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(profile.userId))
    throw new LineLoginError('line_verification_failed', 401);
  return {
    subject: profile.userId,
    displayName: typeof profile.displayName === 'string' ? profile.displayName.slice(0, 200) : '',
  };
}
