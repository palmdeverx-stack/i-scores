import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const schema = {};
vm.runInNewContext(compile('../src/sections/inventory/inventory-asset-schema.ts'), {
  exports: schema,
  require,
});
const item = '33333333-3333-4333-8333-333333333333';
const id = '77777777-7777-4777-8777-777777777777';
const receipt = '88888888-8888-4888-8888-888888888888';
const body = {
  action: 'register',
  id,
  item_id: item,
  receipt_movement_id: receipt,
  asset_code: 'EQ-001',
  serial_number: 'SN001',
  acquisition_date: '2026-10-24',
  acquisition_cost: 10000,
  notes: '',
};
function setup({ authenticated = true, manage = true, error = null } = {}) {
  const calls = [];
  const exports = {};
  const db = {
    from(table) {
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          calls.push(['eq', table, key, value]);
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        then(resolve) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        },
      };
      return q;
    },
    async rpc(name, args) {
      calls.push(['rpc', name, args]);
      return { data: [], error };
    },
  };
  vm.runInNewContext(compile('../src/app/api/inventory/assets/route.ts'), {
    exports,
    URL,
    console: { error() {} },
    require(name) {
      if (name === 'src/lib/auth-token')
        return {
          requireRole: () =>
            authenticated ? { schoolId: 'school', sub: 'actor', role: 'teacher' } : null,
        };
      if (name === 'src/lib/supabase-admin') return { supabaseAdmin: db };
      if (name === 'src/lib/department-permission-access')
        return {
          canViewViaPermission: async () => true,
          canManageViaPermission: async () => manage,
        };
      if (name === 'src/sections/inventory/inventory-asset-schema') return schema;
      return require(name);
    },
  });
  return { ...exports, calls };
}
const request = (value) =>
  new Request('http://localhost/api/inventory/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
test('asset registration requires management rights', async () => {
  const api = setup({ manage: false });
  assert.equal((await api.POST(request(body))).status, 403);
  assert.equal(api.calls.length, 0);
});
test('registration is atomic and uses server school and actor', async () => {
  const api = setup();
  assert.equal(
    (await api.POST(request({ ...body, school_id: 'attacker', registered_by: 'attacker' }))).status,
    201
  );
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0][1], 'register_inventory_asset');
  assert.equal(api.calls[0][2].p_school, 'school');
  assert.equal(api.calls[0][2].p_actor, 'actor');
  assert.equal(api.calls[0][2].p_receipt, receipt);
});
test('cannot activate without custodian and a location', async () => {
  const api = setup();
  assert.equal(
    (await api.POST(request({ action: 'activate', id, custodian: '', location: '' }))).status,
    400
  );
  assert.equal(api.calls.length, 0);
});
test('activation goes through registry RPC rather than stock issue', async () => {
  const api = setup();
  assert.equal(
    (
      await api.POST(
        request({ action: 'activate', id, custodian: 'ครูตัวอย่าง', location: 'ห้องคอมพิวเตอร์' })
      )
    ).status,
    200
  );
  assert.equal(api.calls[0][1], 'activate_inventory_asset');
  assert.equal(api.calls[0][2].p_id, id);
  assert.equal(api.calls[0][2].p_school, 'school');
});
test('receipt registration limit errors are reported without success', async () => {
  const api = setup({ error: { code: 'P0001', message: 'Receipt already fully registered' } });
  assert.equal((await api.POST(request(body))).status, 409);
});
test('available receipt counts are scoped to the school', async () => {
  const api = setup();
  assert.equal(
    (await api.GET(new Request(`http://localhost/api/inventory/assets?itemId=${item}`))).status,
    200
  );
  assert.equal(api.calls[0][1], 'inventory_asset_receipts');
  assert.equal(api.calls[0][2].p_school, 'school');
});
test('invalid registration metadata is rejected', async () => {
  const api = setup();
  for (const patch of [
    { asset_code: '' },
    { acquisition_date: 'invalid' },
    { acquisition_cost: -1 },
    { receipt_movement_id: 'invalid' },
  ])
    assert.equal((await api.POST(request({ ...body, ...patch }))).status, 400);
  assert.equal(api.calls.length, 0);
});
