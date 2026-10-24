import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/app/api/inventory/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const school = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const item = '33333333-3333-4333-8333-333333333333';
const movement = {
  action: 'movement',
  id: '44444444-4444-4444-8444-444444444444',
  item_id: item,
  kind: 'issue',
  quantity: 2,
  recipient: 'ครูทดสอบ',
  note: 'ใช้ในห้องเรียน',
  school_id: 'attacker-school',
  created_by: 'attacker',
};
function setup({
  authenticated = true,
  view = true,
  manage = true,
  approve = manage,
  rpcError = null,
  dbError = null,
} = {}) {
  const calls = [];
  const db = {
    from(table) {
      const query = {
        delete() {
          calls.push(['delete', table]);
          return query;
        },
        select() {
          return query;
        },
        eq(key, value) {
          calls.push(['eq', table, key, value]);
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        insert(values) {
          calls.push(['insert', table, values]);
          return query;
        },
        update(values) {
          calls.push(['update', table, values]);
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: { id: item }, error: dbError });
        },
        then(resolve) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push(['rpc', name, args]);
      return { error: rpcError };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    URL,
    exports,
    console: { error() {} },
    require(name) {
      if (name === 'src/lib/auth-token')
        return {
          requireRole: () =>
            authenticated ? { sub: actor, schoolId: school, role: 'teacher' } : null,
        };
      if (name === 'src/lib/supabase-admin') return { supabaseAdmin: db };
      if (name === 'src/lib/department-permission-access')
        return {
          canManageViaPermission: async (_caller, permission) =>
            permission === 'inventory.approve' ? approve : manage,
          canViewViaPermission: async () => view,
        };
      return require(name);
    },
  });
  return { ...exports, calls };
}
const request = (body) =>
  new Request('http://localhost/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('unauthenticated callers cannot read or write inventory', async () => {
  const api = setup({ authenticated: false });
  assert.equal((await api.GET(new Request('http://localhost/api/inventory'))).status, 403);
  assert.equal((await api.POST(request(movement))).status, 403);
  assert.equal(api.calls.length, 0);
});
test('view permission does not allow stock mutation', async () => {
  const api = setup({ manage: false });
  assert.equal((await api.POST(request(movement))).status, 403);
  assert.equal(api.calls.length, 0);
});
test('inventory and master lists are scoped to the authenticated school', async () => {
  const api = setup({ manage: false });
  const response = await api.GET(new Request('http://localhost/api/inventory?school_id=attacker'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).canManage, false);
  assert.equal(
    api.calls.filter((call) => call[0] === 'eq' && call[2] === 'school_id' && call[3] === school)
      .length,
    6
  );
});
test('rejects negative, fractional, empty-recipient and malformed movements', async () => {
  const api = setup();
  for (const patch of [
    { quantity: -1 },
    { quantity: 1.5 },
    { quantity: 0 },
    { recipient: '' },
    { item_id: 'invalid' },
  ]) {
    assert.equal((await api.POST(request({ ...movement, ...patch }))).status, 400);
  }
  assert.equal(api.calls.length, 0);
});
test('legacy direct issue and receipt endpoints cannot bypass document workflow', async () => {
  const api = setup();
  assert.equal((await api.POST(request(movement))).status, 400);
  assert.equal((await api.POST(request({ ...movement, kind: 'receive' }))).status, 400);
  assert.equal(api.calls.length, 0);
});
test('editing metadata is school scoped and cannot set quantity', async () => {
  const api = setup();
  const response = await api.POST(
    request({
      action: 'item',
      id: item,
      code: 'P001',
      name: 'กระดาษ',
      category: 'วัสดุสำนักงาน',
      unit: 'รีม',
      location: 'ห้องพัสดุ',
      minimum_stock: 5,
      quantity: 999,
      school_id: 'attacker',
    })
  );
  assert.equal(response.status, 200);
  const update = api.calls.find((call) => call[0] === 'update')[2];
  assert.equal('quantity' in update, false);
  assert.equal('school_id' in update, false);
  assert.ok(
    api.calls.some((call) => call[0] === 'eq' && call[2] === 'school_id' && call[3] === school)
  );
});

test('master creation uses only the authenticated school', async () => {
  const api = setup();
  const response = await api.POST(
    request({ action: 'master', kind: 'category', name: 'สำนักงาน', school_id: 'attacker' })
  );
  assert.equal(response.status, 201);
  const insert = api.calls.find((call) => call[0] === 'insert');
  assert.equal(insert[1], 'inventory_categories');
  assert.equal(insert[2].school_id, school);
});
test('renaming units is scoped to the authenticated school', async () => {
  const api = setup();
  assert.equal(
    (await api.POST(request({ action: 'master', kind: 'unit', id: item, name: 'รีม' }))).status,
    200
  );
  assert.equal(api.calls.find((call) => call[0] === 'update')[1], 'inventory_units');
  assert.ok(
    api.calls.some((call) => call[0] === 'eq' && call[2] === 'school_id' && call[3] === school)
  );
});
test('view-only teachers cannot change masters', async () => {
  const api = setup({ manage: false });
  assert.equal(
    (await api.POST(request({ action: 'master', kind: 'unit', name: 'รีม' }))).status,
    403
  );
  assert.equal(api.calls.length, 0);
});
test('master validation rejects empty labels, invalid kinds and oversized units', async () => {
  const api = setup();
  for (const body of [
    { kind: 'unit', name: ' ' },
    { kind: 'unknown', name: 'test' },
    { kind: 'unit', name: 'a'.repeat(41) },
  ]) {
    assert.equal((await api.POST(request({ action: 'master', ...body }))).status, 400);
  }
  assert.equal(api.calls.length, 0);
});

test('master deletion is scoped and rejects records still in use', async () => {
  const api = setup({ dbError: { code: '23503' } });
  const response = await api.POST(
    request({ action: 'master', kind: 'unit', id: item, name: 'ชิ้น', remove: true })
  );
  assert.equal(response.status, 409);
  assert.equal(api.calls.find((call) => call[0] === 'delete')[1], 'inventory_units');
  assert.ok(
    api.calls.some((call) => call[0] === 'eq' && call[2] === 'school_id' && call[3] === school)
  );
});
test('invalid master ordering and status cannot be saved', async () => {
  const api = setup();
  for (const patch of [{ sort_order: -1 }, { sort_order: 0.5 }, { is_active: 'true' }]) {
    assert.equal(
      (await api.POST(request({ action: 'master', kind: 'category', name: 'วัสดุ', ...patch })))
        .status,
      400
    );
  }
  assert.equal(api.calls.length, 0);
});

test('item details are saved but quantity and image path cannot be injected', async () => {
  const api = setup();
  const response = await api.POST(
    request({
      action: 'item',
      id: item,
      code: 'P002',
      name: 'เครื่องพิมพ์',
      category: 'คอมพิวเตอร์',
      unit: 'เครื่อง',
      location: 'สำนักงาน',
      minimum_stock: 0,
      description: 'เครื่องพิมพ์สำนักงาน',
      brand: 'Brand',
      model: 'Model',
      specifications: 'A4',
      barcode: '123456',
      reference_price: 3500.5,
      supplier: 'ผู้จำหน่าย',
      notes: 'เก็บในที่แห้ง',
      image_path: 'another-school/private.jpg',
      quantity: 99,
    })
  );
  assert.equal(response.status, 200);
  const fields = api.calls.find((call) => call[0] === 'update')[2];
  assert.equal(fields.reference_price, 3500.5);
  assert.equal(fields.brand, 'Brand');
  assert.equal('image_path' in fields, false);
  assert.equal('quantity' in fields, false);
});
test('rejects negative prices and oversized descriptions', async () => {
  const api = setup();
  for (const patch of [{ reference_price: -1 }, { description: 'x'.repeat(4001) }]) {
    assert.equal(
      (
        await api.POST(
          request({
            action: 'item',
            code: 'P003',
            name: 'พัสดุ',
            category: 'สำนักงาน',
            unit: 'ชิ้น',
            location: '',
            minimum_stock: 0,
            ...patch,
          })
        )
      ).status,
      400
    );
  }
  assert.equal(api.calls.length, 0);
});

test('creating items requests an auto code and ignores manually supplied codes', async () => {
  const api = setup();
  const response = await api.POST(
    request({
      action: 'item',
      code: 'MANUAL-999',
      name: 'พัสดุใหม่',
      category: 'สำนักงาน',
      unit: 'ชิ้น',
      location: '',
      minimum_stock: 0,
    })
  );
  assert.equal(response.status, 201);
  assert.equal(api.calls.find((call) => call[0] === 'insert')[2].code, null);
});
test('editing an item cannot rewrite its generated code', async () => {
  const api = setup();
  await api.POST(
    request({
      action: 'item',
      id: item,
      code: 'CHANGED',
      name: 'พัสดุ',
      category: 'สำนักงาน',
      unit: 'ชิ้น',
      location: '',
      minimum_stock: 0,
    })
  );
  assert.equal('code' in api.calls.find((call) => call[0] === 'update')[2], false);
});

test('API rejects invalid MIN/MAX range', async () => {
  const api = setup();
  const response = await api.POST(
    request({
      action: 'item',
      name: 'วัสดุ',
      category: 'สำนักงาน',
      unit: 'ชิ้น',
      location: '',
      minimum_stock: 10,
      maximum_stock: 5,
    })
  );
  assert.equal(response.status, 400);
  assert.equal(api.calls.length, 0);
});

test('storage locations are managed within the authenticated school', async () => {
  const api = setup();
  const response = await api.POST(
    request({ action: 'master', kind: 'location', name: 'ห้องพัสดุ อาคาร 1' })
  );
  assert.equal(response.status, 201);
  const insert = api.calls.find((call) => call[0] === 'insert');
  assert.equal(insert[1], 'inventory_locations');
  assert.equal(insert[2].school_id, school);
});
test('clearing an optional storage location writes null', async () => {
  const api = setup();
  await api.POST(
    request({
      action: 'item',
      id: item,
      name: 'วัสดุ',
      category: 'สำนักงาน',
      unit: 'ชิ้น',
      location: '',
      minimum_stock: 0,
    })
  );
  assert.equal(api.calls.find((call) => call[0] === 'update')[2].location, null);
});

const documentBody = {
  action: 'movement_document',
  id: '55555555-5555-4555-8555-555555555555',
  kind: 'issue',
  recipient: 'ครู',
  note: 'ใบเดียวหลายรายการ',
  lines: [
    { item_id: item, quantity: 2 },
    { item_id: '66666666-6666-4666-8666-666666666666', quantity: 1 },
  ],
};
test('multi-line document is sent through a single atomic RPC with server identity', async () => {
  const api = setup();
  const response = await api.POST(
    request({ ...documentBody, school_id: 'attacker', created_by: 'attacker' })
  );
  assert.equal(response.status, 201);
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0][1], 'submit_inventory_document');
  const args = api.calls[0][2];
  assert.equal(args.p_school, school);
  assert.equal(args.p_actor, actor);
  assert.equal(args.p_lines.length, 2);
  assert.equal(args.p_id, documentBody.id);
});
test('document rejects duplicate or invalid lines before writing', async () => {
  const api = setup();
  for (const lines of [
    [],
    [documentBody.lines[0], documentBody.lines[0]],
    [{ item_id: item, quantity: -1 }],
  ]) {
    assert.equal((await api.POST(request({ ...documentBody, lines }))).status, 400);
  }
  assert.equal(api.calls.length, 0);
});
test('a failed document returns a conflict without reporting partial success', async () => {
  const api = setup({ rpcError: { code: 'P0001', message: 'Insufficient stock' } });
  assert.equal((await api.POST(request(documentBody))).status, 409);
  assert.equal(api.calls.length, 1);
});
test('view-only users cannot save multi-line documents', async () => {
  const api = setup({ manage: false });
  assert.equal((await api.POST(request(documentBody))).status, 403);
  assert.equal(api.calls.length, 0);
});

test('stock managers without approval rights cannot approve their own requests', async () => {
  const api = setup({ manage: true, approve: false });
  assert.equal(
    (
      await api.POST(
        request({ action: 'review_document', id: documentBody.id, approve: true, note: '' })
      )
    ).status,
    403
  );
  assert.equal(api.calls.length, 0);
});
test('delegated approvers can review without stock-management permissions', async () => {
  const api = setup({ manage: false, approve: true });
  assert.equal(
    (
      await api.POST(
        request({ action: 'review_document', id: documentBody.id, approve: true, note: '' })
      )
    ).status,
    200
  );
  assert.equal(api.calls[0][1], 'review_inventory_document');
  assert.equal(api.calls[0][2].p_school, school);
  assert.equal(api.calls[0][2].p_actor, actor);
  assert.equal((await api.POST(request(documentBody))).status, 403);
});
test('rejections need an explanation and insufficient stock does not approve', async () => {
  const api = setup({ rpcError: { code: 'P0001', message: 'Insufficient stock' } });
  assert.equal(
    (
      await api.POST(
        request({ action: 'review_document', id: documentBody.id, approve: false, note: '' })
      )
    ).status,
    400
  );
  assert.equal(
    (
      await api.POST(
        request({ action: 'review_document', id: documentBody.id, approve: true, note: '' })
      )
    ).status,
    409
  );
});
test('receipts require source document number and date', async () => {
  const api = setup();
  assert.equal((await api.POST(request({ ...documentBody, kind: 'receive' }))).status, 400);
  assert.equal(api.calls.length, 0);
  assert.equal(
    (
      await api.POST(
        request({
          ...documentBody,
          kind: 'receive',
          reference_number: 'INV-001',
          document_date: '2026-10-24',
        })
      )
    ).status,
    201
  );
  assert.equal(api.calls[0][2].p_reference, 'INV-001');
  assert.equal(api.calls[0][2].p_date, '2026-10-24');
});

test('receipt links source request through the school-scoped RPC', async () => {
  const api = setup();
  const source = '77777777-7777-4777-8777-777777777777';
  const response = await api.POST(
    request({
      ...documentBody,
      kind: 'receive',
      reference_number: 'INV-002',
      document_date: '2026-10-24',
      source_request_id: source,
    })
  );
  assert.equal(response.status, 201);
  assert.equal(api.calls[0][2].p_source_request, source);
  assert.equal(api.calls[0][2].p_school, school);
});
test('source request cannot be attached to an issue request', async () => {
  const api = setup();
  assert.equal(
    (
      await api.POST(
        request({ ...documentBody, source_request_id: '77777777-7777-4777-8777-777777777777' })
      )
    ).status,
    400
  );
  assert.equal(api.calls.length, 0);
});
test('remaining receipt quantities are queried for the authenticated school', async () => {
  const api = setup();
  const response = await api.GET(
    new Request(
      'http://localhost/api/inventory?request_source=77777777-7777-4777-8777-777777777777'
    )
  );
  assert.equal(response.status, 200);
  assert.equal(api.calls[0][1], 'inventory_request_remaining');
  assert.equal(api.calls[0][2].p_school, school);
});

test('purchase receipt preserves school-scoped linkage', async () => {
  const api = setup();
  const source = '77777777-7777-4777-8777-777777777777';
  const response = await api.POST(
    request({
      ...documentBody,
      kind: 'receive',
      reference_number: 'DEL-001',
      document_date: '2026-10-24',
      source_purchase_id: source,
    })
  );
  assert.equal(response.status, 201);
  assert.equal(api.calls[0][2].p_source_purchase, source);
  assert.equal(api.calls[0][2].p_school, school);
});
test('receipt cannot reference purchase and issue simultaneously', async () => {
  const api = setup();
  assert.equal(
    (
      await api.POST(
        request({
          ...documentBody,
          kind: 'receive',
          reference_number: 'DEL-001',
          document_date: '2026-10-24',
          source_purchase_id: documentBody.id,
          source_request_id: documentBody.id,
        })
      )
    ).status,
    400
  );
  assert.equal(api.calls.length, 0);
});
