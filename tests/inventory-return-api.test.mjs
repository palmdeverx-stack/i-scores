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
vm.runInNewContext(compile('src/sections/inventory/inventory-return-schema.ts'), {
  exports: schema,
  require,
});
const id = '99999999-9999-4999-8999-999999999999';
const material = {
  id,
  kind: 'material',
  source_document_id: id,
  document_date: '2026-10-25',
  returned_by: 'Teacher',
  note: 'Unused',
  lines: [{ item_id: id, quantity: 2 }],
};
const equipment = {
  ...material,
  kind: 'equipment',
  source_document_id: null,
  lines: [{ asset_id: id, activated_at: '2026-10-20T00:00:00Z', condition: 'good' }],
};
function setup({ authenticated = true, manage = true, view = true, error = null } = {}) {
  const calls = [];
  const exported = {};
  vm.runInNewContext(compile('src/app/api/inventory/returns/route.ts'), {
    exports: exported,
    Promise,
    URL,
    require(name) {
      if (name === 'next/server')
        return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
      if (name.endsWith('/auth-token'))
        return { requireRole: () => (authenticated ? { sub: 'actor', schoolId: 'school' } : null) };
      if (name.endsWith('/department-permission-access'))
        return {
          canViewViaPermission: async () => view,
          canManageViaPermission: async () => manage,
        };
      if (name.endsWith('/inventory-return-schema')) return schema;
      if (name.endsWith('/supabase-admin'))
        return {
          supabaseAdmin: {
            rpc: async (name, args) => {
              calls.push({ rpc: name, args });
              return { data: id, error };
            },
            from(table) {
              const call = { table, filters: [] };
              calls.push(call);
              const q = {
                select: () => q,
                eq: (key, value) => {
                  call.filters.push([key, value]);
                  return q;
                },
                order: () => q,
                limit: () => q,
                maybeSingle: async () => ({
                  data: {
                    id,
                    document_number: 1,
                    recipient: 'Teacher',
                    lines: [{ item_id: id, quantity: 5 }],
                  },
                  error: null,
                }),
                then: (resolve, reject) =>
                  Promise.resolve({
                    data:
                      table === 'inventory_returns'
                        ? [{ request_lines: [{ item_id: id, quantity: 2 }] }]
                        : [],
                    error: null,
                  }).then(resolve, reject),
              };
              return q;
            },
          },
        };
      return require(name);
    },
  });
  return {
    post: (body) => exported.POST({ json: async () => body }),
    get: (query = '') => exported.GET({ url: `http://localhost/api/inventory/returns${query}` }),
    calls,
  };
}
test('return recording requires manage permission', async () => {
  for (const options of [{ authenticated: false }, { manage: false }]) {
    const { post, calls } = setup(options);
    assert.equal((await post(material)).status, 403);
    assert.equal(calls.length, 0);
  }
});
test('API validates return lines, source type, duplicates and condition', async () => {
  for (const body of [
    { ...material, lines: [] },
    { ...material, lines: [{ item_id: id, quantity: 0 }] },
    { ...material, lines: [{ item_id: id, quantity: 1.5 }] },
    { ...material, lines: [material.lines[0], material.lines[0]] },
    { ...equipment, source_document_id: id },
    { ...equipment, lines: [{ ...equipment.lines[0], condition: 'unknown' }] },
    { ...equipment, lines: [{ ...equipment.lines[0], activated_at: '' }] },
  ]) {
    const { post, calls } = setup();
    assert.equal((await post(body)).status, 400);
    assert.equal(calls.length, 0);
  }
});
test('server owns actor and school and preserves the retry id for both return types', async () => {
  for (const body of [material, equipment]) {
    const { post, calls } = setup();
    assert.equal((await post({ ...body, school_id: 'forged', created_by: 'forged' })).status, 201);
    const args = calls[0].args;
    assert.equal(args.p_actor, 'actor');
    assert.equal(args.p_school, 'school');
    assert.equal(args.p_id, id);
    assert.equal(args.p_source, body.source_document_id);
  }
});
test('business conflicts return 409 rather than treating a duplicate return as new stock', async () => {
  const { post } = setup({
    error: { code: 'P0001', message: 'Return exceeds outstanding issue quantity' },
  });
  assert.equal((await post(material)).status, 409);
  const asset = setup({ error: { code: 'P0001', message: 'Asset custody changed' } });
  assert.equal((await asset.post(equipment)).status, 409);
});
test('remaining material quantities are computed from same-school posted source and prior returns', async () => {
  const { get, calls } = setup();
  const response = await get(`?source=${id}`);
  assert.equal(response.body.lines[0].quantity, 3);
  for (const call of calls)
    assert.ok(call.filters.some(([key, value]) => key === 'school_id' && value === 'school'));
  const source = calls.find((call) => call.table === 'inventory_documents');
  assert.ok(source.filters.some(([key, value]) => key === 'status' && value === 'posted'));
});
test('unauthorized source reads and malformed ids are rejected', async () => {
  assert.equal((await setup({ view: false }).get()).status, 403);
  const { get, calls } = setup();
  assert.equal((await get('?source=bad')).status, 400);
  assert.equal(calls.length, 0);
});
