import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const userId = '11111111-1111-4111-8111-111111111111',
  identityId = '22222222-2222-4222-8222-222222222222',
  schoolId = '33333333-3333-4333-8333-333333333333';
function load(file, mocks = {}) {
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
      Date,
      Request,
      process: {
        env: {
          AUTH_JWT_SECRET: 'test-only-ekru-private-signing-secret',
          MASTER_ADMIN_PIN: '12345678',
        },
      },
      require(name) {
        if (name === 'server-only') return {};
        if (name in mocks) return mocks[name];
        if (name === 'jsonwebtoken' || name.startsWith('node:')) return require(name);
        throw new Error(name);
      },
    }
  );
  return exports;
}
test('Marketplace session and admin PIN challenge require the persisted identity id', () => {
  const lib = load('src/lib/auth-token.ts');
  const token = lib.signAppToken({
    sub: userId,
    username: 'buyer',
    schoolId: null,
    role: 'marketplace_user',
    authProvider: 'marketplace',
    marketplaceIdentityId: identityId,
  });
  assert.equal(lib.verifyAppToken(token).role, 'marketplace_user');
  assert.equal(
    lib.verifyAppToken(
      lib.signAppToken({
        sub: userId,
        username: 'buyer',
        schoolId: null,
        role: 'marketplace_user',
        authProvider: 'marketplace',
      })
    ),
    null
  );
  assert.equal(
    lib.verifyPinChallenge(lib.signPinChallenge(userId, 'marketplace', identityId))
      .marketplaceIdentityId,
    identityId
  );
  assert.equal(lib.verifyPinChallenge(lib.signPinChallenge(userId, 'marketplace')), null);
});
for (const [mapping, expected] of [
  [{ is_active: true, marketplace_user_id: userId }, 'active'],
  [{ is_active: false, marketplace_user_id: userId }, 'inactive'],
  [{ is_active: true, marketplace_user_id: 'other-buyer' }, 'inactive'],
  [null, 'inactive'],
])
  test('SSO session is bound to the current active Marketplace identity ' + expected, async () => {
    const lib = load('src/lib/session-security.ts', {
      'src/lib/supabase-admin': {
        supabaseAdmin: {
          from(table) {
            const q = {
              select: () => q,
              eq: () => q,
              maybeSingle: async () => ({
                data:
                  table === 'marketplace_sso_identities'
                    ? mapping
                    : { id: userId, is_active: true, session_revoked_at: null },
              }),
            };
            return q;
          },
        },
      },
    });
    assert.equal(
      await lib.getSessionStatus({
        sub: userId,
        role: 'marketplace_user',
        schoolId: null,
        authProvider: 'marketplace',
        marketplaceIdentityId: identityId,
      }),
      expected
    );
  });
function pinSetup({
  role = 'school_admin',
  active = true,
  schoolActive = true,
  licensed = true,
  identityActive = true,
  rateAllowed = true,
} = {}) {
  const signed = [];
  const response = (body, init = {}) => ({
    body,
    status: init.status ?? 200,
    cookies: { set: (...args) => signed.push(args) },
  });
  const lib = load('src/lib/verify-staff-pin.ts', {
    'next/server': { NextResponse: { json: response } },
    'src/lib/auth-token': {
      verifyPinChallenge: () => ({
        sub: userId,
        authProvider: 'marketplace',
        marketplaceIdentityId: identityId,
      }),
      signAppToken: (payload) => {
        signed.push(['payload', payload]);
        return 'app-token';
      },
      toPublicUser: (v) => v,
      ACCESS_TOKEN_COOKIE: 'access_token',
      accessTokenCookieOptions: { httpOnly: true },
    },
    'src/lib/school-subscription': { isSchoolAccessUsable: async () => licensed },
    'src/lib/auth-rate-limit': {
      isSignInAllowed: async () => rateAllowed,
      AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS: 60,
    },
    'src/lib/supabase-admin': {
      supabaseAdmin: {
        from(table) {
          const result = {
            data:
              table === 'app_users'
                ? { id: userId, username: 'admin', role, school_id: schoolId, is_active: active }
                : table === 'schools'
                  ? { code: '87654321', is_active: schoolActive }
                  : identityActive
                    ? { id: identityId }
                    : null,
          };
          const q = {
            select: () => q,
            eq: () => q,
            single: async () => result,
            maybeSingle: async () => result,
          };
          return q;
        },
      },
    },
  });
  return {
    run: (pin) =>
      lib.verifyStaffPinRequest(
        new Request('https://e-kru.com/api/auth/verify-pin', {
          method: 'POST',
          body: JSON.stringify({ pinChallengeToken: 'signed-challenge', pin }),
        })
      ),
    signed,
  };
}
test('correct PIN preserves school admin role and SSO identity using the original PIN implementation', async () => {
  const s = pinSetup();
  assert.equal((await s.run('87654321')).status, 200);
  assert.equal(s.signed.find((c) => c[0] === 'payload')[1].marketplaceIdentityId, identityId);
});
for (const [options, pin] of [
  [{}, 'wrong-pin'],
  [{}, '00000000'],
  [{ active: false }, '87654321'],
  [{ schoolActive: false }, '87654321'],
  [{ licensed: false }, '87654321'],
  [{ identityActive: false }, '87654321'],
  [{ rateAllowed: false }, '87654321'],
])
  test(
    'PIN cannot bypass account, school, package or SSO identity restrictions ' +
      JSON.stringify(options) +
      pin,
    async () => {
      const s = pinSetup(options);
      assert.notEqual((await s.run(pin)).status, 200);
      assert.equal(s.signed.length, 0);
    }
  );
