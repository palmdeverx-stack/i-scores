import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const schema = {};
vm.runInNewContext(compile('../src/sections/inventory/inventory-purchase-schema.ts'), {
  exports: schema,
  require,
});
const purchaseId = '77777777-7777-4777-8777-777777777777';
const itemId = '33333333-3333-4333-8333-333333333333';
const body = {
  action: 'create',
  id: purchaseId,
  title: 'จัดซื้อวัสดุ',
  purpose: 'ใช้ในการเรียนการสอน',
  lines: [{ item_id: itemId, quantity: 5 }],
};
function setup({
  authenticated = true,
  manage = true,
  approve = false,
  status = 'approved',
  found = true,
} = {}) {
  const calls = [];
  const db = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          calls.push(['eq', table, key, value]);
          return query;
        },
        in(key, value) {
          calls.push(['in', table, key, value]);
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        update(values) {
          calls.push(['update', table, values]);
          return query;
        },
        async maybeSingle() {
          return {
            data: found
              ? {
                  id: purchaseId,
                  status,
                  attachment_path: 'school/old.pdf',
                  lines: body.lines,
                  created_by: 'actor',
                  reviewed_by: null,
                }
              : null,
          };
        },
        then(resolve) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push(['rpc', name, args]);
      return { data: purchaseId, error: null };
    },
    storage: {
      from() {
        return {
          async upload(path) {
            calls.push(['upload', path]);
            return {};
          },
          async remove() {
            return {};
          },
          async createSignedUrl() {
            return { data: { signedUrl: 'https://example.com/private-po.pdf' } };
          },
        };
      },
    },
  };
  const load = (path) => {
    const exports = {};
    vm.runInNewContext(compile(path), {
      exports,
      File,
      Buffer,
      crypto,
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
            canViewViaPermission: async () => manage || approve,
            canManageViaPermission: async (_caller, key) =>
              key === 'inventory.approve' ? approve : manage,
          };
        if (name === 'src/sections/inventory/inventory-purchase-schema') return schema;
        return require(name);
      },
    });
    return exports;
  };
  return {
    api: load('../src/app/api/inventory/purchases/route.ts'),
    attachment: load('../src/app/api/inventory/purchases/[id]/attachment/route.ts'),
    detail: load('../src/app/api/inventory/purchases/[id]/route.ts'),
    calls,
  };
}
const request = (value) =>
  new Request('http://localhost/api/inventory/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
const context = { params: Promise.resolve({ id: purchaseId }) };
function fileRequest(file) {
  const data = new FormData();
  data.append('file', file);
  return new Request('http://localhost/attachment', { method: 'POST', body: data });
}
test('unauthorized users cannot view or create purchasing records', async () => {
  const { api, calls } = setup({ authenticated: false });
  assert.equal((await api.GET(new Request('http://localhost'))).status, 403);
  assert.equal((await api.POST(request(body))).status, 403);
  assert.equal(calls.length, 0);
});
test('purchase request uses the authenticated school and never writes stock', async () => {
  const { api, calls } = setup();
  assert.equal(
    (await api.POST(request({ ...body, school_id: 'attacker', created_by: 'attacker' }))).status,
    201
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'save_inventory_purchase');
  assert.equal(calls[0][2].p_school, 'school');
  assert.equal(calls[0][2].p_actor, 'actor');
});
test('invalid or duplicate purchase lines are rejected', async () => {
  const { api, calls } = setup();
  for (const lines of [[], [body.lines[0], body.lines[0]], [{ item_id: itemId, quantity: 1.5 }]])
    assert.equal((await api.POST(request({ ...body, lines }))).status, 400);
  assert.equal(calls.length, 0);
});
test('managers cannot approve unless delegated approval rights', async () => {
  const { api, calls } = setup();
  assert.equal(
    (await api.POST(request({ action: 'review', id: purchaseId, approve: true, note: '' }))).status,
    403
  );
  assert.equal(calls.length, 0);
});
test('approvers can approve but cannot place orders without management rights', async () => {
  const { api, calls } = setup({ manage: false, approve: true });
  assert.equal(
    (await api.POST(request({ action: 'review', id: purchaseId, approve: true, note: '' }))).status,
    200
  );
  assert.equal(calls[0][1], 'review_inventory_purchase');
  assert.equal(
    (
      await api.POST(
        request({
          action: 'order',
          id: purchaseId,
          supplier: 'บริษัท',
          order_number: 'PO-001',
          order_date: '2026-10-24',
        })
      )
    ).status,
    403
  );
});
test('orders require supplier, reference and valid date', async () => {
  const { api } = setup();
  assert.equal(
    (
      await api.POST(
        request({ action: 'order', id: purchaseId, supplier: '', order_number: '', order_date: '' })
      )
    ).status,
    400
  );
  assert.equal(
    (
      await api.POST(
        request({
          action: 'order',
          id: purchaseId,
          supplier: 'บริษัท',
          order_number: 'PO-001',
          order_date: '2026-10-24',
        })
      )
    ).status,
    200
  );
});
test('PO attachment can only be changed after approval and before ordering', async () => {
  const { attachment, calls } = setup({ status: 'ordered' });
  assert.equal(
    (
      await attachment.POST(
        fileRequest(new File(['%PDF-1.7\n'], 'po.pdf', { type: 'application/pdf' })),
        context
      )
    ).status,
    409
  );
  assert.equal(
    calls.some((call) => call[0] === 'upload'),
    false
  );
});
test('PO attachment rejects disguised files and files above 10MB', async () => {
  const { attachment, calls } = setup();
  for (const file of [
    new File(['not a pdf'], 'po.pdf', { type: 'application/pdf' }),
    new File([new Uint8Array(10485761)], 'big.pdf', { type: 'application/pdf' }),
  ])
    assert.equal((await attachment.POST(fileRequest(file), context)).status, 400);
  assert.equal(
    calls.some((call) => call[0] === 'upload'),
    false
  );
});
test('valid PO is private and stored under the school and purchase ID', async () => {
  const { attachment, calls } = setup();
  assert.equal(
    (
      await attachment.POST(
        fileRequest(new File(['%PDF-1.7\n'], 'po.pdf', { type: 'application/pdf' })),
        context
      )
    ).status,
    200
  );
  assert.ok(calls.find((call) => call[0] === 'upload')[1].startsWith(`school/${purchaseId}/`));
  assert.ok(
    calls.some((call) => call[0] === 'eq' && call[2] === 'school_id' && call[3] === 'school')
  );
  const response = await attachment.GET(new Request('http://localhost'), context);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('purchase detail allows delegated approvers and scopes all data to their school', async () => {
  const { detail, calls } = setup({ manage: false, approve: true });
  const response = await detail.GET(new Request('http://localhost'), context);
  assert.equal(response.status, 200);
  assert.ok(
    calls.some(
      (call) =>
        call[0] === 'eq' &&
        call[1] === 'inventory_purchases' &&
        call[2] === 'school_id' &&
        call[3] === 'school'
    )
  );
  assert.ok(
    calls.some(
      (call) =>
        call[0] === 'eq' &&
        call[1] === 'inventory_items' &&
        call[2] === 'school_id' &&
        call[3] === 'school'
    )
  );
  assert.equal((await response.json()).canApprove, true);
});
test('purchase detail is inaccessible without inventory permissions', async () => {
  const { detail, calls } = setup({ manage: false, approve: false });
  assert.equal((await detail.GET(new Request('http://localhost'), context)).status, 403);
  assert.equal(calls.length, 0);
});
test('missing or foreign-school purchases do not produce a document', async () => {
  const { detail } = setup({ found: false });
  assert.equal((await detail.GET(new Request('http://localhost'), context)).status, 404);
});

test('draft can be saved with a title before purpose and lines are complete', async () => {
  const { api, calls } = setup();
  const response = await api.POST(
    request({ action: 'draft', id: purchaseId, title: 'วัสดุภาคเรียนใหม่', purpose: '', lines: [] })
  );
  assert.equal(response.status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], 'save_inventory_purchase');
  assert.equal(calls[0][2].p_draft, true);
  assert.equal(calls[0][2].p_id, purchaseId);
  assert.equal(calls[0][2].p_school, 'school');
});
test('submission requires complete fields and marks the same document as submitted', async () => {
  const { api, calls } = setup();
  assert.equal((await api.POST(request({ ...body, purpose: '', lines: [] }))).status, 400);
  assert.equal((await api.POST(request(body))).status, 201);
  assert.equal(calls[0][2].p_draft, false);
  assert.equal(calls[0][2].p_id, purchaseId);
});
test('draft still requires a title and valid quantities for selected items', async () => {
  const { api, calls } = setup();
  for (const patch of [{ title: '' }, { lines: [{ item_id: itemId, quantity: 0 }] }])
    assert.equal((await api.POST(request({ ...body, action: 'draft', ...patch }))).status, 400);
  assert.equal(calls.length, 0);
});
test('owners with management rights can reopen their draft', async () => {
  const { detail } = setup({ status: 'draft' });
  const response = await detail.GET(new Request('http://localhost'), context);
  assert.equal((await response.json()).canEditDraft, true);
});
test('submitted documents do not expose draft editing', async () => {
  const { detail } = setup({ status: 'submitted' });
  const response = await detail.GET(new Request('http://localhost'), context);
  assert.equal((await response.json()).canEditDraft, false);
});

test('purchase rejection requires a nonblank reason and forwards it to the review record', async () => {
  const { api, calls } = setup({ approve: true });
  assert.equal(
    (await api.POST(request({ action: 'review', id: purchaseId, approve: false, note: '   ' })))
      .status,
    400
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (
      await api.POST(
        request({
          action: 'review',
          id: purchaseId,
          approve: false,
          note: '  งบประมาณไม่เพียงพอ  ',
        })
      )
    ).status,
    200
  );
  assert.equal(calls[0][1], 'review_inventory_purchase');
  assert.equal(calls[0][2].p_approve, false);
  assert.equal(calls[0][2].p_note, 'งบประมาณไม่เพียงพอ');
});
