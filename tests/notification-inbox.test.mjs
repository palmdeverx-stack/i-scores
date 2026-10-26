import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const compile = (path) =>
  ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
function setup({ authenticated = true, fail = false } = {}) {
  const calls = [];
  const exported = {};
  const deps = (name) => {
    if (name === 'next/server')
      return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
    if (name.endsWith('/auth-token'))
      return {
        requireRole: () =>
          authenticated ? { sub: 'actor', schoolId: 'school', role: 'teacher' } : null,
      };
    if (name.endsWith('/workflow-notifications'))
      return { flushWorkflowNotifications: async (school) => calls.push(['flush', school]) };
    if (name.endsWith('/supabase-admin'))
      return {
        supabaseAdmin: {
          from(table) {
            const op = { table, filters: [] };
            calls.push(op);
            const q = {
              select: (_fields, options) => {
                op.count = Boolean(options?.head);
                return q;
              },
              eq: (key, value) => {
                op.filters.push([key, value]);
                return q;
              },
              is: () => q,
              in: () => q,
              order: () => q,
              limit: () => q,
              update: (values) => {
                op.update = values;
                return q;
              },
              then: (resolve, reject) =>
                Promise.resolve({
                  data: [{ id: 'one', read_at: null }],
                  count: 75,
                  error: fail ? { message: 'failed' } : null,
                }).then(resolve, reject),
            };
            return q;
          },
        },
      };
    return require(name);
  };
  vm.runInNewContext(compile('src/app/api/notifications/route.ts'), {
    exports: exported,
    require: deps,
    console,
    Promise,
  });
  const mark = {};
  vm.runInNewContext(compile('src/app/api/notifications/mark-read/route.ts'), {
    exports: mark,
    require: deps,
    Date,
  });
  return {
    get: () => exported.GET({}),
    mark: (body) => mark.POST({ json: async () => body }),
    calls,
  };
}
test('unread count includes messages outside the latest list, scoped by user and school', async () => {
  const { get, calls } = setup();
  const response = await get();
  assert.equal(response.body.notifications.length, 1);
  assert.equal(response.body.unreadCount, 75);
  assert.ok(
    calls.some((call) => Array.isArray(call) && call[0] === 'flush' && call[1] === 'school')
  );
  for (const call of calls.filter((call) => call.table)) {
    assert.ok(call.filters.some(([key, value]) => key === 'user_id' && value === 'actor'));
    assert.ok(call.filters.some(([key, value]) => key === 'school_id' && value === 'school'));
  }
});
test('invalid mark-read requests never mark the entire inbox read', async () => {
  for (const body of [null, { ids: 'all' }, { ids: [] }, { ids: ['invalid'] }]) {
    const { mark, calls } = setup();
    assert.equal((await mark(body)).status, 400);
    assert.equal(calls.length, 0);
  }
});
test('marking an item or all items read remains scoped to the current school and user', async () => {
  for (const body of [{}, { ids: ['99999999-9999-4999-8999-999999999999'] }]) {
    const { mark, calls } = setup();
    assert.equal((await mark(body)).status, 200);
    assert.ok(calls[0].filters.some(([key, value]) => key === 'user_id' && value === 'actor'));
    assert.ok(calls[0].filters.some(([key, value]) => key === 'school_id' && value === 'school'));
  }
});
test('unauthenticated callers cannot read or mark notifications', async () => {
  const { get, mark, calls } = setup({ authenticated: false });
  assert.equal((await get()).status, 403);
  assert.equal((await mark({})).status, 403);
  assert.equal(calls.length, 0);
});
