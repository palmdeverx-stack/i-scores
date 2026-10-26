import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
export function compile(file, mocks = {}, extra = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      Buffer,
      URL,
      URLSearchParams,
      Date,
      Request,
      Number,
      AbortSignal,
      process: {
        env: {
          NODE_ENV: 'production',
          AUTH_JWT_SECRET: 'a-test-only-private-ekru-session-secret',
          MARKETPLACE_SSO_SECRET: 'a-test-only-shared-marketplace-secret-32',
        },
      },
      require(name) {
        if (name === 'server-only') return {};
        if (name in mocks) return mocks[name];
        if (name.startsWith('node:') || name === 'jsonwebtoken') return require(name);
        throw new Error(name);
      },
      ...extra,
    }
  );
  return exports;
}
const lib = compile('src/lib/marketplace-sso-crypto.ts');
const { safeInternalPath } = compile('src/auth/utils/safe-internal-path.ts');
test('SSO transaction is encrypted, authenticated and limited to five minutes', () => {
  const raw = lib.sealSsoCookie({
    state: 'private-state',
    verifier: 'private-verifier',
    returnTo: '/account/apps',
  });
  assert.ok(!raw.includes('private-state'));
  assert.ok(!raw.includes('private-verifier'));
  assert.equal(lib.openSsoCookie(raw).state, 'private-state');
  const bytes = Buffer.from(raw, 'base64url');
  bytes[30] ^= 1;
  assert.throws(() => lib.openSsoCookie(bytes.toString('base64url')));
  assert.throws(() => lib.openSsoCookie(lib.sealSsoCookie({ state: 'x' }, Date.now() - 1)));
  assert.throws(() => lib.openSsoCookie(lib.sealSsoCookie({}, Date.now() + 301000)));
  assert.equal(lib.ssoCookieOptions.httpOnly, true);
  assert.equal(lib.ssoCookieOptions.secure, true);
  assert.equal(lib.ssoCookieOptions.sameSite, 'lax');
  assert.equal(lib.ssoCookieOptions.maxAge, 300);
});
test('state and PKCE use independent 256-bit random values and S256', () => {
  const state = lib.ssoSecret(),
    verifier = lib.ssoSecret();
  assert.notEqual(state, verifier);
  assert.equal(verifier.length, 43);
  assert.equal(
    lib.ssoChallenge(verifier),
    require('node:crypto').createHash('sha256').update(verifier).digest('base64url')
  );
  assert.ok(lib.ssoMatches(state, state));
  assert.ok(!lib.ssoMatches(state, 'different'));
  assert.equal(lib.getSsoConfig().callback, 'https://e-kru.com/auth/marketplace/callback');
});
for (const path of [
  'https://evil.test',
  '//evil.test',
  '/\\evil.test',
  '/%5cevil',
  '/%2f%2fevil',
  '/%252f%252fevil',
  '/.//evil.test',
  '/x\r\nLocation:evil',
  '/api/auth/sign-out',
  '/auth/marketplace/callback?code=secret',
  '/auth/marketplace/start',
  '/auth/marketplace/continue',
])
  test('rejects unsafe returnTo ' + JSON.stringify(path), () =>
    assert.equal(safeInternalPath(path), null)
  );
test('preserves safe local path, query and fragment; allows only the explicit onboarding route for local login', () => {
  assert.equal(safeInternalPath('/launch?app=CHAT_AI'), '/launch?app=CHAT_AI');
  assert.equal(safeInternalPath('/account/apps#purchased'), '/account/apps#purchased');
  assert.equal(safeInternalPath('/auth/marketplace/continue', true), '/auth/marketplace/continue');
});
