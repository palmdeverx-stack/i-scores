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
const schema = {};
vm.runInNewContext(compile('src/sections/notifications/notification-compose-schema.ts'), {
  exports: schema,
  require,
});
const code = compile('src/app/api/notifications/send/route.ts');
const id = '99999999-9999-4999-8999-999999999999';
const body = { id, title: 'Notice', body: 'Message', recipientIds: [id] };
function setup({ allowed = true, found = true } = {}) {
  const exported = {};
  const calls = [];
  vm.runInNewContext(code, {
    exports: exported,
    Set,
    require(name) {
      if (name === 'next/server')
        return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
      if (name.endsWith('/auth-token'))
        return { requireRole: () => (allowed ? { sub: 'admin', schoolId: 'school' } : null) };
      if (name.endsWith('/notification-compose-schema')) return schema;
      if (name.endsWith('/supabase-admin'))
        return {
          supabaseAdmin: {
            from(table) {
              const call = { table, filters: [] };
              calls.push(call);
              const q = {
                select: () => q,
                order: () => q,
                eq: (key, value) => {
                  call.filters.push([key, value]);
                  return q;
                },
                in: () => q,
                upsert: (rows, options) => {
                  call.rows = rows;
                  call.options = options;
                  return q;
                },
                then: (resolve, reject) =>
                  Promise.resolve({ data: found ? [{ id }] : [], error: null }).then(
                    resolve,
                    reject
                  ),
              };
              return q;
            },
          },
        };
      return require(name);
    },
  });
  return { post: (payload = body) => exported.POST({ json: async () => payload }), calls };
}
test('sending is restricted to school administrators', async () => {
  const { post, calls } = setup({ allowed: false });
  assert.equal((await post()).status, 403);
  assert.equal(calls.length, 0);
});
test('missing or inactive recipients cannot be notified across school boundaries', async () => {
  const { post, calls } = setup({ found: false });
  assert.equal((await post()).status, 400);
  assert.equal(
    calls.some((call) => call.rows),
    false
  );
  assert.ok(calls[0].filters.some(([key, value]) => key === 'school_id' && value === 'school'));
});
test('manual sends use idempotent recipient keys and the server school', async () => {
  const { post, calls } = setup();
  assert.equal((await post()).status, 200);
  const insert = calls.find((call) => call.rows);
  assert.equal(insert.rows[0].school_id, 'school');
  assert.equal(insert.rows[0].event_key, `internal:admin:${id}`);
  assert.equal(insert.options.ignoreDuplicates, true);
});
test('empty messages and malformed recipients are rejected without writes', async () => {
  for (const patch of [
    { title: '' },
    { body: '' },
    { recipientIds: [] },
    { recipientIds: ['bad'] },
  ]) {
    const { post, calls } = setup();
    assert.equal((await post({ ...body, ...patch })).status, 400);
    assert.equal(calls.length, 0);
  }
});
