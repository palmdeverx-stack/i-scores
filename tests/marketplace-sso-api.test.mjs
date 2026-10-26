import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const env = {
  NODE_ENV: 'production',
  AUTH_JWT_SECRET: 'test-only-ekru-private-cookie-key',
  MARKETPLACE_SSO_SECRET: 'test-only-shared-secret-at-least-32-characters',
};
function load(file, mocks = {}, extra = {}) {
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
      Request,
      Date,
      Number,
      AbortSignal,
      process: { env },
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
const crypto = load('src/lib/marketplace-sso-crypto.ts');
const paths = load('src/auth/utils/safe-internal-path.ts');
const id = '11111111-1111-4111-8111-111111111111',
  identityId = '22222222-2222-4222-8222-222222222222',
  buyer = '33333333-3333-4333-8333-333333333333';
function setup({
  role = 'marketplace_user',
  failure = null,
  pending = false,
  codeAccepted = true,
  expired = false,
  claimAvailable = true,
  pinOk = true,
  origin = true,
  loggedIn = true,
} = {}) {
  const calls = [],
    issued = [];
  let consumed = false;
  const profile = {
    id: buyer,
    username: 'existing-buyer',
    role,
    school_id: role === 'marketplace_user' ? null : 'school',
  };
  const identity = {
    id: identityId,
    marketplace_user_id: role === 'marketplace_user' ? buyer : null,
    app_user_id: role === 'marketplace_user' ? null : buyer,
  };
  const response = (body, init = {}) => {
    const cookies = new Map();
    return {
      body,
      ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
      status: init.status ?? 200,
      headers: new Headers(init.headers),
      cookies: {
        set: (key, value, options) => {
          cookies.set(key, { value });
          issued.push([key, value, options]);
        },
        get: (key) => cookies.get(key),
      },
    };
  };
  const libs = {
    ...crypto,
    exchangeMarketplaceCode: async (code, verifier) => {
      calls.push(['exchange', code, verifier]);
      if (!codeAccepted) throw new crypto.MarketplaceSsoError('exchange_failed', 401);
      return { subject: 'remote-buyer' };
    },
    resolveMarketplaceIdentity: async () => identity,
    loadSsoProfile: async () => {
      if (failure) throw new crypto.MarketplaceSsoError(failure, 403);
      return pending ? null : profile;
    },
    ssoDestination: async (p, returnTo) =>
      paths.safeInternalPath(returnTo) ??
      (p.role === 'marketplace_user' ? '/account/apps' : '/teacher'),
    completeSso: async (...args) => calls.push(['complete', ...args]),
    clearSsoCookie: (r, all) => {
      r.cookies.set(crypto.SSO_COOKIE, '', { maxAge: 0 });
      if (all) r.cookies.set(crypto.SSO_PENDING_COOKIE, '', { maxAge: 0 });
    },
    readSsoPending: async () => ({
      data: {
        id,
        identityId,
        kind: pending ? 'link' : 'pin',
        challenge: 'server-only-pin-challenge',
        returnTo: '/account/apps',
      },
      identity,
    }),
    loadSsoIdentity: async () => identity,
    verifyExistingSsoLinkSession: async (caller) => {
      calls.push(['link-session', caller]);
      if (!caller) throw new crypto.MarketplaceSsoError('existing_login_required', 403);
      return profile;
    },
  };
  const mocks = {
    'next/server': {
      NextResponse: {
        json: response,
        redirect: (url, init = {}) =>
          response(null, {
            ...init,
            status: 307,
            headers: { ...init.headers, location: url.href },
          }),
      },
    },
    'src/lib/marketplace-sso-crypto': { ...crypto, sameSsoOrigin: () => origin },
    'src/auth/utils/safe-internal-path': paths,
    'src/lib/marketplace-sso': libs,
    'src/lib/supabase-admin': {
      supabaseAdmin: {
        from: (table) => ({
          insert: async (row) => {
            calls.push(['insert', table, row]);
            return { error: null };
          },
          update: (row) => ({
            eq: async () => {
              calls.push(['update', table, row]);
              return { error: null };
            },
          }),
        }),
        rpc: async (name, params) => {
          calls.push([name, params]);
          if (name === 'claim_marketplace_sso') {
            if (consumed || !claimAvailable) return { data: [] };
            consumed = true;
            return { data: [{ id }] };
          }
          return { data: buyer };
        },
      },
    },
    'src/lib/auth-rate-limit': {
      getClientIp: () => '127.0.0.1',
      isSignInAllowed: async () => true,
    },
    'src/lib/auth-token': {
      ACCESS_TOKEN_COOKIE: 'access_token',
      accessTokenCookieOptions: { httpOnly: true, secure: true },
      signAppToken: (value) => {
        calls.push(['mint', value]);
        return 'ekru-session-token';
      },
      signPinChallenge: (...args) => {
        calls.push(['pin', ...args]);
        return 'private-pin-challenge';
      },
      getRequestToken: () => (loggedIn ? 'existing-token' : null),
      verifyAppToken: () => ({ sub: buyer, role }),
    },
    'src/lib/verify-staff-pin': {
      verifyStaffPinRequest: async (req) => {
        calls.push(['verify-pin', await req.json()]);
        const r = response(
          { message: pinOk ? 'ok' : 'PIN incorrect' },
          { status: pinOk ? 200 : 401 }
        );
        if (pinOk) r.cookies.set('access_token', 'verified-pin-session', {});
        return r;
      },
    },
  };
  const state = 'a'.repeat(43),
    verifier = 'b'.repeat(43);
  const cookie = crypto.sealSsoCookie(
    { kind: 'oauth', id, state, verifier, returnTo: '/account/apps' },
    Date.now() + (expired ? -1 : 240000)
  );
  const request = (query = `state=${state}&code=one-time-code`, body = {}) => ({
    url: `https://e-kru.com/auth/marketplace/callback?${query}`,
    nextUrl: new URL(`https://e-kru.com/auth/marketplace/callback?${query}`),
    headers: new Headers({ origin: 'https://e-kru.com' }),
    cookies: { get: (key) => (key === crypto.SSO_COOKIE ? { value: cookie } : undefined) },
    json: async () => body,
  });
  return {
    start: load('src/app/auth/marketplace/start/route.ts', mocks),
    callback: load('src/app/auth/marketplace/callback/route.ts', mocks),
    complete: load('src/app/api/auth/marketplace/complete/route.ts', mocks),
    request,
    calls,
    issued,
    crypto,
  };
}
test('start sends state/S256/redirect URI only; verifier and returnTo stay encrypted in secure cookie', async () => {
  const s = setup();
  const r = await s.start.GET(s.request('returnTo=%2Faccount%2Fapps'));
  const url = new URL(r.headers.get('location'));
  assert.equal(url.origin, 'https://e-kru-marketplace.com');
  assert.equal(url.pathname, '/api/sso/authorize');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://e-kru.com/auth/marketplace/callback');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.has('code_verifier'), false);
  assert.equal(url.searchParams.has('returnTo'), false);
  const saved = s.issued.find((c) => c[0] === crypto.SSO_COOKIE);
  const tx = crypto.openSsoCookie(saved[1]);
  assert.equal(url.searchParams.get('state'), tx.state);
  assert.equal(url.searchParams.get('code_challenge'), crypto.ssoChallenge(tx.verifier));
  assert.equal(saved[2].secure, true);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  const row = s.calls.find((c) => c[0] === 'insert')[2];
  assert.equal(row.state_hash, crypto.ssoHash(tx.state));
  assert.ok(!JSON.stringify(row).includes(tx.verifier));
});
test('start rejects open redirect before creating a transaction', async () => {
  const s = setup();
  const r = await s.start.GET(s.request('returnTo=https%3A%2F%2Fevil.test'));
  assert.equal(r.status, 400);
  assert.ok(!s.calls.some((c) => c[0] === 'insert'));
});
test('successful buyer SSO keeps marketplace_user and uses a new E-KRU cookie', async () => {
  const s = setup();
  const r = await s.callback.GET(s.request());
  assert.equal(r.headers.get('location'), 'https://e-kru.com/account/apps');
  const mint = s.calls.find((c) => c[0] === 'mint')[1];
  assert.equal(mint.role, 'marketplace_user');
  assert.equal(mint.schoolId, null);
  assert.equal(mint.authProvider, 'marketplace');
  assert.equal(mint.marketplaceIdentityId, identityId);
  assert.equal(s.issued.find((c) => c[0] === 'access_token')[1], 'ekru-session-token');
  assert.ok(!r.headers.get('location').includes('code='));
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
});
for (const options of [
  { expired: true },
  { claimAvailable: false },
  { codeAccepted: false },
  { failure: 'account_unavailable' },
  { failure: 'school_unavailable' },
  { failure: 'license_unavailable' },
])
  test('callback fails closed ' + JSON.stringify(options), async () => {
    const s = setup(options);
    const r = await s.callback.GET(s.request());
    assert.ok(
      r.headers.get('location').startsWith('https://e-kru.com/auth/marketplace/continue?error=')
    );
    assert.ok(!s.calls.some((c) => c[0] === 'mint'));
    assert.ok(!r.headers.get('location').includes('one-time-code'));
    if (options.expired || options.claimAvailable === false)
      assert.ok(!s.calls.some((c) => c[0] === 'exchange'));
  });
test('wrong browser state never exchanges a code', async () => {
  const s = setup();
  await s.callback.GET(s.request('state=wrong&code=one-time-code'));
  assert.ok(!s.calls.some((c) => c[0] === 'exchange'));
});
test('code cannot be used twice and query verifier never overrides the server verifier', async () => {
  const s = setup();
  await s.callback.GET(s.request(undefined));
  const first = s.calls.find((c) => c[0] === 'exchange');
  assert.equal(first[2], 'b'.repeat(43));
  await s.callback.GET(s.request());
  assert.equal(s.calls.filter((c) => c[0] === 'exchange').length, 1);
  assert.equal(s.calls.filter((c) => c[0] === 'mint').length, 1);
});
test('unmapped identity goes to consent/onboarding without granting any session', async () => {
  const s = setup({ pending: true });
  const r = await s.callback.GET(s.request());
  assert.equal(r.headers.get('location'), 'https://e-kru.com/auth/marketplace/continue');
  assert.ok(s.issued.some((c) => c[0] === crypto.SSO_PENDING_COOKIE));
  assert.ok(!s.calls.some((c) => c[0] === 'mint'));
});
for (const role of ['master_admin', 'school_admin'])
  test(`${role} must complete E-KRU PIN, not merely exchange SSO`, async () => {
    const s = setup({ role });
    const r = await s.callback.GET(s.request());
    assert.equal(r.headers.get('location'), 'https://e-kru.com/auth/marketplace/continue');
    assert.ok(!s.calls.some((c) => c[0] === 'mint'));
    const pending = crypto.openSsoCookie(
      s.issued.find((c) => c[0] === crypto.SSO_PENDING_COOKIE)[1]
    );
    assert.equal(pending.kind, 'pin');
    assert.equal(pending.challenge, 'private-pin-challenge');
    assert.ok(!r.headers.get('location').includes('private-pin-challenge'));
  });
test('PIN confirmation reuses the original PIN verifier and completes the one-use transaction before returning its cookie', async () => {
  const s = setup({ role: 'school_admin' });
  const r = await s.complete.POST(s.request('', { action: 'pin', pin: '12345678' }));
  assert.equal(r.status, 200);
  assert.equal(
    s.calls.find((c) => c[0] === 'verify-pin')[1].pinChallengeToken,
    'server-only-pin-challenge'
  );
  assert.ok(s.calls.some((c) => c[0] === 'complete'));
});
test('wrong PIN does not complete the SSO transaction', async () => {
  const s = setup({ role: 'school_admin', pinOk: false });
  const r = await s.complete.POST(s.request('', { action: 'pin', pin: '12345678' }));
  assert.equal(r.status, 401);
  assert.ok(!s.calls.some((c) => c[0] === 'complete'));
});
test('onboarding link requires an existing authenticated account and ignores target ids from the browser', async () => {
  const s = setup({ pending: true, loggedIn: false });
  const r = await s.complete.POST(s.request('', { action: 'link', userId: 'admin' }));
  assert.equal(r.status, 403);
  assert.ok(!s.calls.some((c) => c[0] === 'complete'));
});
test('completion rejects cross-origin requests', async () => {
  const s = setup({ origin: false });
  assert.equal((await s.complete.POST(s.request('', { action: 'create' }))).status, 403);
});

test('switching to an existing E-KRU account clears access cookies without deleting pending consent', async () => {
  const s = setup({ pending: true });
  const r = await s.complete.POST(s.request('', { action: 'switch-account' }));
  assert.equal(r.status, 200);
  assert.equal(r.body.redirectTo, '/auth/jwt/sign-in?returnTo=%2Fauth%2Fmarketplace%2Fcontinue');
  assert.ok(s.issued.some((c) => c[0] === 'access_token' && c[2].maxAge === 0));
  assert.ok(!s.issued.some((c) => c[0] === crypto.SSO_PENDING_COOKIE));
  assert.ok(!s.calls.some((c) => c[0] === 'complete'));
});
