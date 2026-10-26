import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
function setup({
  loggedIn = true,
  token = 'raw-id-token',
  serverOk = true,
  link = false,
  redirect = '/teacher',
  initFail = false,
  permission = null,
  refreshedToken = null,
  consentFails = false,
} = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync('src/auth/line-login-client.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      URL,
      URLSearchParams,
      window: { location: { origin: 'https://ekru.test', search: link ? '?intent=link' : '' } },
      require: () => ({ getLineLoginMessage: (code) => code }),
      fetch: async (url, init) => {
        calls.push([url, JSON.parse(init.body)]);
        return {
          ok: serverOk,
          json: async () =>
            url.endsWith('/verify')
              ? { redirectTo: redirect, code: 'not_linked' }
              : { ready: true, code: 'invalid_state' },
        };
      },
    }
  );
  let currentToken = token;
  const liff = {
    init: async (config) => {
      calls.push(['init', config]);
      if (initFail) throw new Error('init failed');
    },
    isLoggedIn: () => loggedIn,
    login: (config) => calls.push(['login', config]),
    getIDToken: () => currentToken,
    ...(permission
      ? {
          permission: {
            query: async (scope) => {
              calls.push(['permission', scope]);
              return { state: permission[scope] ?? 'granted' };
            },
            requestAll: async () => {
              calls.push(['consent']);
              if (consentFails) throw new Error('denied');
              currentToken = refreshedToken;
            },
          },
        }
      : {}),
  };
  return { run: () => exports.completeLiffLogin(liff, '2012217961-zWHJVvh5'), calls };
}
test('LIFF initializes on the E-KRU page and submits raw token only to same-origin verification', async () => {
  const s = setup();
  assert.equal(await s.run(), '/teacher');
  assert.equal(s.calls[0][0], 'init');
  assert.equal(s.calls[0][1].liffId, '2012217961-zWHJVvh5');
  assert.deepEqual(s.calls[1], [
    '/api/auth/line/start',
    { intent: 'resume', expectedIntent: 'login' },
  ]);
  assert.deepEqual(s.calls[2], ['/api/auth/line/verify', { idToken: 'raw-id-token' }]);
});
test('external browser login returns to E-KRU and preserves linking intent', async () => {
  const s = setup({ loggedIn: false, link: true });
  assert.equal(await s.run(), null);
  assert.equal(s.calls[1][0], 'login');
  assert.equal(s.calls[1][1].redirectUri, 'https://ekru.test/auth/line?intent=link');
  assert.equal(s.calls.length, 2);
});
test('verified link goes to explicit confirmation and never directly enters a different account', async () => {
  const s = setup({ link: true, redirect: '/teacher/profile?lineLogin=pending' });
  assert.equal(await s.run(), '/teacher/profile?lineLogin=pending');
  assert.equal(s.calls[1][1].expectedIntent, 'link');
});
for (const config of [
  { token: null },
  { serverOk: false },
  { redirect: 'https://marketplace.test' },
  { initFail: true },
])
  test('client fails closed ' + JSON.stringify(config), async () => {
    const s = setup(config);
    await assert.rejects(s.run());
  });

test('MINI App requests missing consent once and sends only the fresh ID token', async () => {
  const s = setup({
    token: null,
    permission: { openid: 'granted', profile: 'prompt' },
    refreshedToken: 'fresh-id-token',
  });
  assert.equal(await s.run(), '/teacher');
  assert.equal(s.calls.filter((c) => c[0] === 'consent').length, 1);
  assert.deepEqual(
    s.calls.find((c) => c[0] === '/api/auth/line/verify'),
    ['/api/auth/line/verify', { idToken: 'fresh-id-token' }]
  );
});
for (const options of [
  { permission: { openid: 'unavailable' } },
  { permission: { openid: 'granted', profile: 'granted' } },
  { permission: { openid: 'prompt', profile: 'prompt' }, consentFails: true },
  { permission: { openid: 'prompt', profile: 'prompt' }, refreshedToken: null },
])
  test(
    'missing token never creates a session or loops consent ' + JSON.stringify(options),
    async () => {
      const s = setup({ token: null, ...options });
      await assert.rejects(s.run());
      assert.ok(
        !s.calls.some((c) => c[0] === '/api/auth/line/verify' || c[0] === '/api/auth/line/start')
      );
      assert.ok(s.calls.filter((c) => c[0] === 'consent').length <= 1);
      if (options.permission.profile === 'granted' || options.permission.openid === 'unavailable')
        assert.ok(!s.calls.some((c) => c[0] === 'consent'));
    }
  );

test('an existing valid token does not trigger additional permissions or consent', async () => {
  const s = setup({ permission: { openid: 'granted', profile: 'prompt' } });
  assert.equal(await s.run(), '/teacher');
  assert.ok(!s.calls.some((c) => c[0] === 'permission' || c[0] === 'consent'));
});
