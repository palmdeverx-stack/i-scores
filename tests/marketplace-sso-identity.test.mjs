import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
class MarketplaceSsoError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
const uuid = '11111111-1111-4111-8111-111111111111';
function setup({
  shared = false,
  profileActive = true,
  school = true,
  licensed = true,
  remote = {},
  upstreamOk = true,
} = {}) {
  const calls = [];
  let identity = {
    id: 'identity',
    issuer: 'https://e-kru-marketplace.com',
    subject: 'buyer-subject',
    remote_user_id: remote.user_id ?? uuid,
    is_active: true,
    app_user_id: null,
    marketplace_user_id: null,
  };
  const db = {
    auth: {
      admin: {
        getUserById: async (id) => {
          calls.push(['auth-lookup', id]);
          return { data: { user: { id } } };
        },
      },
    },
    from(table) {
      calls.push(['table', table]);
      let change = null;
      const q = {
        upsert: async () => ({ error: null }),
        update: (value) => {
          change = value;
          return q;
        },
        select: () => q,
        eq: (...args) => {
          calls.push(['eq', table, ...args]);
          return q;
        },
        is: () => q,
        maybeSingle: async () => ({
          data:
            table === 'marketplace_sso_identities'
              ? identity
              : table === 'schools'
                ? { is_active: school }
                : {
                    id: uuid,
                    username: 'existing-user',
                    auth_user_id: uuid,
                    role: 'teacher',
                    school_id: 'school',
                    is_active: profileActive,
                  },
        }),
        then(resolve, reject) {
          if (change && table === 'marketplace_sso_identities')
            identity = { ...identity, ...change };
          return Promise.resolve({ error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  const exports = {};
  const valid = {
    issuer: 'https://e-kru-marketplace.com',
    subject: 'buyer-subject',
    account_type: 'marketplace_user',
    user_id: uuid,
    auth_user_id: uuid,
    first_name: 'Verified',
    last_name: 'Buyer',
    ...remote,
  };
  vm.runInNewContext(
    ts.transpileModule(readFileSync('src/lib/marketplace-sso.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      URL,
      URLSearchParams,
      Date,
      AbortSignal,
      process: {
        env: shared
          ? {
              MARKETPLACE_SSO_SHARED_SUPABASE_URL: 'https://same.supabase.co',
              NEXT_PUBLIC_SUPABASE_URL: 'https://same.supabase.co',
            }
          : {},
      },
      fetch: async (url, init) => {
        calls.push(['fetch', url, init]);
        return { ok: upstreamOk, json: async () => valid };
      },
      require(name) {
        if (name === 'server-only') return {};
        if (name === './supabase-admin') return { supabaseAdmin: db };
        if (name === './session-security') return { getSessionStatus: async () => 'active' };
        if (name === './school-subscription') return { isSchoolAccessUsable: async () => licensed };
        if (name === './ekru-app-access') return {};
        if (name.includes('safe-internal-path') || name.includes('role-home-path')) return {};
        if (name === './marketplace-sso-crypto')
          return {
            MarketplaceSsoError,
            SSO_ISSUER: 'https://e-kru-marketplace.com',
            getSsoConfig: () => ({
              secret: 'server-only-secret',
              callback: 'https://e-kru.com/auth/marketplace/callback',
            }),
          };
        throw new Error(name);
      },
    }
  );
  return { lib: exports, calls };
}
test('exchange is server-to-server with the exact Bearer secret, verifier and redirect URI', async () => {
  const s = setup();
  await s.lib.exchangeMarketplaceCode('one-time-code', 'retained-verifier');
  const c = s.calls.find((c) => c[0] === 'fetch');
  assert.equal(c[1], 'https://e-kru-marketplace.com/api/sso/exchange');
  assert.equal(c[2].headers.Authorization, 'Bearer server-only-secret');
  assert.deepEqual(JSON.parse(c[2].body), {
    code: 'one-time-code',
    code_verifier: 'retained-verifier',
    redirect_uri: 'https://e-kru.com/auth/marketplace/callback',
  });
  assert.equal(c[2].redirect, 'error');
  assert.equal(c[2].cache, 'no-store');
});
for (const options of [
  { upstreamOk: false },
  { remote: { issuer: 'https://evil.test' } },
  { remote: { subject: null } },
  { remote: { auth_user_id: 'bad-uuid' } },
  { remote: { is_active: false } },
  { remote: { status: 'suspended' } },
])
  test(
    'invalid, suspended, expired-code or wrong-verifier exchange fails closed ' +
      JSON.stringify(options),
    async () => {
      const s = setup(options);
      await assert.rejects(s.lib.exchangeMarketplaceCode('code', 'verifier'));
    }
  );
test('auth_user_id is never used to link across unconfirmed Supabase projects', async () => {
  const s = setup();
  const remote = await s.lib.exchangeMarketplaceCode('code', 'verifier');
  const identity = await s.lib.resolveMarketplaceIdentity(remote);
  assert.equal(identity.marketplace_user_id, uuid);
  assert.ok(!s.calls.some((c) => c[0] === 'auth-lookup'));
  assert.ok(!s.calls.some((c) => c[0] === 'eq' && c[2] === 'auth_user_id'));
  assert.ok(!s.calls.some((c) => c[0] === 'table' && c[1] === 'app_users'));
});
test('confirmed shared project maps buyer identity but never grants staff roles, even when account_type says administrator', async () => {
  const s = setup({ shared: true, remote: { account_type: 'master_admin' } });
  const identity = await s.lib.resolveMarketplaceIdentity(
    await s.lib.exchangeMarketplaceCode('code', 'verifier')
  );
  assert.equal(identity.marketplace_user_id, uuid);
  assert.equal(identity.app_user_id, null);
  assert.ok(!s.calls.some((c) => c[0] === 'table' && c[1] === 'app_users'));
  const profile = await s.lib.loadSsoProfile(identity);
  assert.equal(profile.role, 'marketplace_user');
  assert.equal(profile.school_id, null);
});
test('LINE identity without auth_user_id can remain in onboarding without a teacher or school being created', async () => {
  const s = setup({ remote: { auth_user_id: null, user_id: 'opaque-line-buyer' } });
  const identity = await s.lib.resolveMarketplaceIdentity(
    await s.lib.exchangeMarketplaceCode('code', 'verifier')
  );
  assert.equal(identity.app_user_id, null);
  assert.equal(identity.marketplace_user_id, null);
  assert.ok(!s.calls.some((c) => c[0] === 'auth-lookup'));
});
for (const options of [{ profileActive: false }, { school: false }, { licensed: false }])
  test(
    'linked staff account must pass active account, school and package checks ' +
      JSON.stringify(options),
    async () => {
      const s = setup(options);
      await assert.rejects(s.lib.loadSsoProfile({ app_user_id: uuid, marketplace_user_id: null }));
    }
  );
