import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
class LineLoginError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
const caller = { sub: 'teacher-id', schoolId: 'school-id', role: 'teacher' };
const origin = 'https://ekru.test';
const config = { channelId: '2012217961', liffId: '2012217961-zWHJVvh5' };
function setup({
  intent = 'login',
  state = true,
  claimed = true,
  linked = true,
  eligible = true,
  sessionChanged = false,
  verification = true,
  conflict = false,
  sameOrigin = true,
  oldSession = true,
  rateAllowed = true,
  hasCookies = true,
  flowAvailable = true,
  channel = config.channelId,
  endpoint = `${origin}/auth/line`,
} = {}) {
  const calls = [];
  const tokens = [];
  const flow = {
    intent,
    channel_id: channel,
    redirect_uri: endpoint,
    app_user_id: caller.sub,
    school_id: caller.schoolId,
    session_hash: 'session',
  };
  const response = (body, init = {}) => ({
    body,
    status: init.status ?? 200,
    headers: init.headers,
    cookies: { set: (...args) => tokens.push(args) },
  });
  const lib = {
    LineLoginError,
    getLineLoginConfig: () => config,
    lineRequestOrigin: (r) => new URL(r.url).origin,
    lineSameOrigin: () => sameOrigin,
    lineSecret: () => 'random-flow-secret',
    lineDigest: (value) => `hash:${value}`,
    lineFlowSecrets: () => {
      if (!state) throw new LineLoginError('invalid_state');
      return { stateHash: 'state-hash', browserHash: 'browser-hash' };
    },
    clearLineFlowCookies: () => {},
    requireLineLinkSession: async () => {
      if (!oldSession) throw new LineLoginError('existing_login_required', 403);
      return { caller, sessionHash: sessionChanged ? 'changed' : 'session' };
    },
    verifyLineIdToken: async (_config, token) => {
      calls.push(['verify', token]);
      if (!verification) throw new LineLoginError('line_verification_failed', 401);
      return { subject: 'line-subject', displayName: 'LINE Name' };
    },
    eligibleLineTeacher: async () => {
      if (!eligible) throw new LineLoginError('account_unavailable', 403);
      return { id: caller.sub, school_id: caller.schoolId, username: 'existing-teacher' };
    },
  };
  const db = {
    rpc: async (name, params) => {
      calls.push([name, params]);
      if (name === 'claim_line_login_flow') return { data: claimed ? [flow] : [] };
      return conflict ? { error: { code: '23505' } } : { data: 'link-id' };
    },
    from(table) {
      calls.push(['table', table]);
      let updating = false;
      const q = {
        insert: async (data) => {
          calls.push(['insert', table, data]);
          return { error: null };
        },
        update: () => {
          updating = true;
          calls.push(['update', table]);
          return q;
        },
        select: () => q,
        eq: () => q,
        is: () => q,
        gt: () => q,
        maybeSingle: async () => ({
          data:
            table === 'line_login_flows'
              ? updating
                ? { state_hash: 'state-hash' }
                : flowAvailable
                  ? flow
                  : null
              : linked
                ? { id: 'link-id', app_user_id: caller.sub, school_id: caller.schoolId }
                : null,
        }),
      };
      return q;
    },
  };
  function load(file) {
    const exports = {};
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      exports,
      URL,
      Date,
      require(name) {
        if (name === 'next/server') return { NextResponse: { json: response } };
        if (name.endsWith('/line-login')) return lib;
        if (name.endsWith('/supabase-admin')) return { supabaseAdmin: db };
        if (name.endsWith('/auth-token'))
          return {
            signAppToken: (p) => {
              calls.push(['mint', p]);
              return 'app-token';
            },
            ACCESS_TOKEN_COOKIE: 'access_token',
            accessTokenCookieOptions: { httpOnly: true },
            requireRole: () => caller,
          };
        if (name.endsWith('/security-audit')) return { writeSecurityAudit: async () => {} };
        if (name.endsWith('/auth-rate-limit'))
          return { isSignInAllowed: async () => rateAllowed, getClientIp: () => '127.0.0.1' };
        if (name.endsWith('/session-security')) return { getSessionStatus: async () => 'active' };
        if (name.endsWith('/line-login-cookies'))
          return {
            LINE_STATE_COOKIE: 'flow-state',
            LINE_BROWSER_COOKIE: 'flow-browser',
            lineFlowCookieOptions: { httpOnly: true },
          };
        throw new Error(name);
      },
    });
    return exports;
  }
  return {
    verify: load('src/app/api/auth/line/verify/route.ts'),
    start: load('src/app/api/auth/line/start/route.ts'),
    link: load('src/app/api/auth/line/link/route.ts'),
    calls,
    tokens,
    request: (body) => ({
      url: `${origin}/api/auth/line/verify`,
      json: async () => body,
      cookies: { has: () => hasCookies },
    }),
  };
}
test('LIFF verification uses the existing teacher, standard session cookie and fixed teacher home', async () => {
  const s = setup();
  const r = await s.verify.POST(s.request({ idToken: 'raw-token', userId: 'attacker' }));
  assert.equal(r.body.redirectTo, '/teacher');
  assert.equal(s.tokens[0][0], 'access_token');
  const payload = s.calls.find((c) => c[0] === 'mint')[1];
  assert.equal(payload.sub, caller.sub);
  assert.equal(payload.role, 'teacher');
  assert.equal(payload.authProvider, 'line');
  assert.equal(payload.lineLoginId, 'link-id');
  assert.equal(s.tokens[0][2].httpOnly, true);
  assert.equal(s.calls.find((c) => c[0] === 'verify')[1], 'raw-token');
});
for (const options of [
  { state: false },
  { claimed: false },
  { linked: false },
  { eligible: false },
  { verification: false },
  { sameOrigin: false },
  { channel: 'marketplace' },
  { endpoint: 'https://marketplace.test/auth/line' },
])
  test('LIFF failure cannot mint a session ' + JSON.stringify(options), async () => {
    const s = setup(options);
    const r = await s.verify.POST(s.request({ idToken: 'raw-token' }));
    assert.notEqual(r.status, 200);
    assert.equal(s.tokens.length, 0);
    assert.ok(!s.calls.some((c) => c[0] === 'mint'));
  });
test('decoded profile alone is not accepted as authentication', async () => {
  const s = setup();
  const r = await s.verify.POST(s.request({ sub: 'line-subject', name: 'attacker' }));
  assert.equal(r.status, 401);
  assert.ok(!s.calls.some((c) => c[0] === 'verify' || c[0] === 'mint'));
});
test('unlinked LINE never creates an app user or school', async () => {
  const s = setup({ linked: false });
  await s.verify.POST(s.request({ idToken: 'token' }));
  assert.deepEqual(
    s.calls.filter((c) => c[0] === 'table').map((c) => c[1]),
    ['teacher_line_login_links']
  );
});
test('LIFF link verifies only; explicit confirmation is required before creating the mapping', async () => {
  const s = setup({ intent: 'link' });
  const r = await s.verify.POST(s.request({ idToken: 'token' }));
  assert.equal(r.body.redirectTo, '/teacher/profile?lineLogin=pending');
  assert.ok(s.calls.some((c) => c[0] === 'update' && c[1] === 'line_login_flows'));
  assert.ok(!s.calls.some((c) => c[0] === 'confirm_teacher_line_login' || c[0] === 'mint'));
  assert.equal(s.tokens.length, 0);
});
test('link rejects changed existing session before calling LINE', async () => {
  const s = setup({ intent: 'link', sessionChanged: true });
  const r = await s.verify.POST(s.request({ idToken: 'token' }));
  assert.equal(r.body.code, 'session_changed');
  assert.ok(!s.calls.some((c) => c[0] === 'verify'));
});
test('confirm uses only server-bound identity and handles unique conflicts', async () => {
  for (const conflict of [false, true]) {
    const s = setup({ conflict });
    const r = await s.link.POST(
      s.request({ action: 'confirm', userId: 'attacker', subject: 'attacker' })
    );
    assert.equal(r.status, conflict ? 409 : 200);
    const p = s.calls.find((c) => c[0] === 'confirm_teacher_line_login')[1];
    assert.equal(p.p_user, caller.sub);
    assert.equal(p.p_school, caller.schoolId);
    assert.equal(p.p_session, 'session');
    assert.equal(p.p_browser, 'browser-hash');
    assert.equal(s.tokens.length, 0);
  }
});
test('start creates a browser-bound LIFF flow without secret or OAuth code exchange', async () => {
  const s = setup();
  const r = await s.start.POST(s.request({ intent: 'login', app_user_id: 'attacker' }));
  assert.equal(r.body.authorizationUrl, '/auth/line');
  const row = s.calls.find((c) => c[0] === 'insert')[2];
  assert.equal(row.app_user_id, null);
  assert.equal(row.school_id, null);
  assert.equal(row.session_hash, null);
  assert.equal(row.nonce, null);
  assert.equal(row.pkce_verifier, null);
  assert.equal(row.redirect_uri, `${origin}/auth/line`);
  assert.equal(row.state_hash, 'hash:random-flow-secret');
  assert.equal(s.tokens.length, 2);
  assert.equal(s.tokens[0][2].httpOnly, true);
});
for (const options of [{ sameOrigin: false }, { oldSession: false }, { rateAllowed: false }])
  test('link start fails closed ' + JSON.stringify(options), async () => {
    const s = setup(options);
    const r = await s.start.POST(s.request({ intent: 'link' }));
    assert.notEqual(r.status, 200);
    assert.ok(!s.calls.some((c) => c[0] === 'insert'));
    assert.equal(s.tokens.length, 0);
  });
test('LIFF redirect resumes original link without replacing it with an anonymous login', async () => {
  const s = setup({ intent: 'link' });
  const r = await s.start.POST(s.request({ intent: 'resume', expectedIntent: 'link' }));
  assert.equal(r.status, 200);
  assert.equal(r.body.ready, true);
  assert.ok(!s.calls.some((c) => c[0] === 'insert'));
});
for (const options of [
  { flowAvailable: false },
  { sessionChanged: true },
  { state: false },
  { hasCookies: false },
])
  test(
    'expired or changed link cannot be silently converted into login ' + JSON.stringify(options),
    async () => {
      const s = setup({ intent: 'link', ...options });
      const r = await s.start.POST(s.request({ intent: 'resume', expectedIntent: 'link' }));
      assert.notEqual(r.status, 200);
      assert.ok(!s.calls.some((c) => c[0] === 'insert'));
    }
  );
test('direct LIFF open may create only a login flow and never a teacher or school', async () => {
  const s = setup({ hasCookies: false });
  const r = await s.start.POST(s.request({ intent: 'resume' }));
  assert.equal(r.status, 200);
  const row = s.calls.find((c) => c[0] === 'insert')[2];
  assert.equal(row.intent, 'login');
  assert.equal(row.app_user_id, null);
  assert.deepEqual(
    s.calls.filter((c) => c[0] === 'table').map((c) => c[1]),
    ['line_login_flows']
  );
});
