import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const code = ts.transpileModule(
  readFileSync('src/app/api/navigation/realtime-session/route.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }
).outputText;
const secret = 'test-only-realtime-secret-not-an-app-session-secret';
function setup({
  authenticated = true,
  active = true,
  profileRole = 'teacher',
  inventory = false,
  lessons = false,
  configured = true,
  fail = false,
  remaining = 600,
} = {}) {
  const caller = {
    sub: 'actor',
    schoolId: 'school',
    role: 'teacher',
    exp: Math.floor(Date.now() / 1000) + remaining,
  };
  const filters = [];
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    Date,
    Math,
    Promise,
    process: { env: { SUPABASE_REALTIME_JWT_SECRET: configured ? secret : undefined } },
    require(name) {
      if (name === 'jsonwebtoken') return require(name);
      if (name === 'next/server')
        return {
          NextResponse: {
            json: (body, init) => ({ body, status: init?.status ?? 200, headers: init?.headers }),
          },
        };
      if (name.endsWith('/auth-token'))
        return { requireRole: () => (authenticated ? caller : null) };
      if (name.endsWith('/department-permission-access'))
        return { canManageViaPermission: async () => inventory };
      if (name.endsWith('/lesson-plan-feature-access'))
        return { requireLessonPlanFeature: async () => (lessons ? caller : null) };
      if (name.endsWith('/lesson-plan-access'))
        return { canReviewLessonPlans: async () => lessons };
      if (name.endsWith('/supabase-admin'))
        return {
          supabaseAdmin: {
            from() {
              const q = {
                select: () => q,
                eq: (key, value) => {
                  filters.push([key, value]);
                  return q;
                },
                maybeSingle: async () => ({
                  data: { is_active: active, role: profileRole },
                  error: fail ? {} : null,
                }),
              };
              return q;
            },
          },
        };
      throw new Error(name);
    },
  });
  return { get: () => exports.GET({}), filters };
}
test('requires an active matching application session', async () => {
  for (const options of [
    { authenticated: false },
    { active: false },
    { profileRole: 'school_admin' },
  ]) {
    assert.equal((await setup(options).get()).status, 403);
  }
  assert.equal((await setup({ fail: true }).get()).status, 503);
});
test('unconfigured accounts receive no bearer token', async () => {
  for (const options of [{ configured: false }, { configured: false, inventory: true }]) {
    const response = await setup(options).get();
    assert.equal(response.body.enabled, false);
    assert.equal(response.body.token, undefined);
  }
});
test('token is short lived and uses a dedicated database role and permitted school topics only', async () => {
  const { get, filters } = setup({ inventory: true });
  const response = await get();
  const claims = jwt.verify(response.body.token, secret, {
    algorithms: ['HS256'],
    audience: 'authenticated',
  });
  assert.equal(claims.role, 'task_realtime');
  assert.equal(claims.sub, 'actor');
  assert.equal(claims.school_id, 'school');
  assert.deepEqual(claims.task_topics, [
    'inbox:school:actor',
    'notifications:school',
    'tasks:school:inventory',
  ]);
  assert.equal(claims.exp - claims.iat, 300);
  assert.ok(filters.some(([key, value]) => key === 'school_id' && value === 'school'));
  assert.match(response.headers['Cache-Control'], /no-store/);
});
test('reviewers receive lesson topic and token cannot outlive the app session', async () => {
  const response = await setup({ lessons: true, remaining: 45 }).get();
  const claims = jwt.verify(response.body.token, secret);
  assert.deepEqual(claims.task_topics, [
    'inbox:school:actor',
    'notifications:school',
    'tasks:school:lessons',
  ]);
  assert.ok(claims.exp - claims.iat <= 45);
  assert.equal((await setup({ inventory: true, remaining: -1 }).get()).status, 401);
});

test('ordinary users can receive their inbox without receiving approval topics', async () => {
  const response = await setup().get();
  const claims = jwt.verify(response.body.token, secret);
  assert.deepEqual(claims.task_topics, ['inbox:school:actor', 'notifications:school']);
});
