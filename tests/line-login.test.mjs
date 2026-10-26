import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
function load(file, mocks = {}, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Buffer,
    URL,
    URLSearchParams,
    Date,
    AbortSignal,
    process: {
      env: {
        AUTH_JWT_SECRET: 'test-only-line-auth-secret',
        LINE_LOGIN_CHANNEL_ID: '12345',
        NEXT_PUBLIC_LIFF_ID: '12345-testliff',
      },
    },
    require(name) {
      if (name === 'server-only') return {};
      if (name in mocks) return mocks[name];
      if (name === 'node:crypto') return crypto;
      if (name === 'jsonwebtoken') return require(name);
      throw new Error(`Unmocked ${name}`);
    },
    ...extra,
  });
  return exports;
}
const teacher = {
  id: '11111111-1111-4111-8111-111111111111',
  username: 'teacher',
  role: 'teacher',
  school_id: '22222222-2222-4222-8222-222222222222',
  is_active: true,
};
function helper({
  claims = {},
  providerOk = true,
  user = teacher,
  school = true,
  licensed = true,
  caller = {
    sub: teacher.id,
    schoolId: teacher.school_id,
    role: 'teacher',
    authProvider: 'password',
  },
  session = 'active',
} = {}) {
  const calls = [];
  const lib = load(
    'src/lib/line-login.ts',
    {
      './supabase-admin': {
        supabaseAdmin: {
          from(table) {
            const q = {
              select: () => q,
              eq: () => q,
              maybeSingle: async () => ({
                data: table === 'schools' ? { is_active: school } : user,
              }),
            };
            return q;
          },
        },
      },
      './session-security': { getSessionStatus: async () => session },
      './school-subscription': { isSchoolAccessUsable: async () => licensed },
      './auth-token': { requireRole: () => caller, getRequestToken: () => 'old-app-cookie' },
      './line-login-cookies': {
        LINE_STATE_COOKIE: 'state',
        LINE_BROWSER_COOKIE: 'browser',
        lineFlowCookieOptions: {},
      },
    },
    {
      fetch: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: providerOk,
          json: async () =>
            url.endsWith('/token')
              ? { id_token: 'server-received-id-token' }
              : {
                  iss: 'https://access.line.me',
                  aud: '12345',
                  nonce: 'expected-nonce',
                  exp: Date.now() / 1000 + 300,
                  iat: Date.now() / 1000,
                  sub: 'Utest-subject',
                  name: 'Teacher LINE',
                  ...claims,
                },
        };
      },
    }
  );
  return { lib, calls };
}
test('LIFF needs only its ID and matching server-side channel', () => {
  const { lib } = helper();
  assert.equal(lib.getLineLoginConfig().channelId, '12345');
  assert.equal(lib.getLineLoginConfig().liffId, '12345-testliff');
  assert.equal(lib.lineSecret().length, 43);
});
test('server verifies raw LIFF ID token with the configured channel, without token exchange or channel secret', async () => {
  const { lib, calls } = helper();
  const result = await lib.verifyLineIdToken(lib.getLineLoginConfig(), 'raw-liff-id-token');
  assert.equal(result.subject, 'Utest-subject');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.line.me/oauth2/v2.1/verify');
  assert.equal(calls[0].init.body.get('client_id'), '12345');
  assert.equal(calls[0].init.body.get('id_token'), 'raw-liff-id-token');
  assert.equal(calls[0].init.body.has('client_secret'), false);
  assert.equal(calls[0].init.redirect, 'error');
});
for (const claims of [
  { aud: 'marketplace-channel' },
  { iss: 'https://attacker.test' },
  { exp: 0 },
  { iat: Date.now() / 1000 + 3600 },
  { sub: '' },
]) {
  test(`rejects invalid LIFF claims ${Object.keys(claims)[0]}`, async () => {
    const { lib } = helper({ claims });
    await assert.rejects(
      lib.verifyLineIdToken(lib.getLineLoginConfig(), 'token'),
      /line_verification_failed/
    );
  });
}
test('rejects failed verification, missing token, decoded profile and missing browser binding', async () => {
  const { lib, calls } = helper({ providerOk: false });
  await assert.rejects(lib.verifyLineIdToken(lib.getLineLoginConfig(), 'token'));
  assert.equal(calls.length, 1);
  await assert.rejects(lib.verifyLineIdToken(lib.getLineLoginConfig(), ''));
  await assert.rejects(lib.verifyLineIdToken(lib.getLineLoginConfig(), { sub: 'profile-only' }));
  assert.throws(() => lib.lineFlowSecrets({ cookies: { get: () => undefined } }), /invalid_state/);
  assert.equal(
    lib.lineSameOrigin(
      new Request('https://ekru.test', { headers: { origin: 'https://evil.test' } }),
      'https://ekru.test'
    ),
    false
  );
});
for (const config of [
  { user: null },
  { user: { ...teacher, role: 'school_admin' } },
  { user: { ...teacher, is_active: false } },
  { school: false },
  { licensed: false },
]) {
  test(`account eligibility rejects ${JSON.stringify(config)}`, async () => {
    await assert.rejects(helper(config).lib.eligibleLineTeacher(teacher.id));
  });
}
for (const caller of [
  null,
  { sub: teacher.id, schoolId: teacher.school_id, authProvider: 'line' },
  { sub: teacher.id, schoolId: teacher.school_id, impersonatedBy: 'master' },
]) {
  test('linking requires existing non-impersonated password/Google session', async () => {
    await assert.rejects(
      helper({ caller }).lib.requireLineLinkSession(new Request('https://ekru.test'))
    );
  });
}
test('revoked sessions and password-change requirements cannot link', async () => {
  await assert.rejects(
    helper({ session: 'inactive' }).lib.requireLineLinkSession(new Request('https://ekru.test'))
  );
  await assert.rejects(
    helper({ user: { ...teacher, must_change_password: true } }).lib.requireLineLinkSession(
      new Request('https://ekru.test')
    )
  );
});
test('LINE JWT must be a teacher session bound to a persisted link id', () => {
  const lib = load('src/lib/auth-token.ts');
  const payload = {
    sub: teacher.id,
    username: 'teacher',
    schoolId: teacher.school_id,
    role: 'teacher',
    authProvider: 'line',
    lineLoginId: '33333333-3333-4333-8333-333333333333',
  };
  assert.equal(lib.verifyAppToken(lib.signAppToken(payload))?.authProvider, 'line');
  assert.equal(lib.verifyAppToken(lib.signAppToken({ ...payload, role: 'school_admin' })), null);
  assert.equal(lib.verifyAppToken(lib.signAppToken({ ...payload, lineLoginId: undefined })), null);
});
test('deleting a LINE link invalidates LINE sessions, DB failures fail closed', async () => {
  for (const [link, expected] of [
    [{ data: { id: 'link' } }, 'active'],
    [{ data: null }, 'inactive'],
    [{ error: true }, 'error'],
  ]) {
    const filters = [];
    const lib = load('src/lib/session-security.ts', {
      'src/lib/supabase-admin': {
        supabaseAdmin: {
          from(table) {
            const q = {
              select: () => q,
              eq: (key, value) => {
                filters.push([table, key, value]);
                return q;
              },
              maybeSingle: async () =>
                table === 'teacher_line_login_links'
                  ? link
                  : { data: table === 'schools' ? { is_active: true } : teacher },
            };
            return q;
          },
        },
      },
    });
    assert.equal(
      await lib.getSessionStatus({
        sub: teacher.id,
        schoolId: teacher.school_id,
        role: 'teacher',
        authProvider: 'line',
        lineLoginId: 'binding',
      }),
      expected
    );
    assert.ok(
      filters.some(
        ([table, key, value]) =>
          table === 'teacher_line_login_links' && key === 'id' && value === 'binding'
      )
    );
  }
});

test('E-KRU rejects a Marketplace LIFF ID paired with the teacher channel', () => {
  const mocks = {
    './supabase-admin': {},
    './session-security': {},
    './school-subscription': {},
    './auth-token': {},
    './line-login-cookies': {},
  };
  const lib = load('src/lib/line-login.ts', mocks, {
    process: {
      env: { LINE_LOGIN_CHANNEL_ID: '2012217961', NEXT_PUBLIC_LIFF_ID: '2012215524-EcpK5XKz' },
    },
  });
  assert.throws(() => lib.getLineLoginConfig(), /not_configured/);
});
