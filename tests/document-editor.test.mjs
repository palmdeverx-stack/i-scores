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
const content = {};
vm.runInNewContext(compile('../src/sections/documents/document-content.ts'), {
  exports: content,
  require,
});
const catalog = {};
vm.runInNewContext(compile('../src/sections/documents/document-catalog.ts'), {
  exports: catalog,
  require,
});
const memo = catalog.getSchoolDocumentTemplate('memo');
const sample = content.templateDocumentContent(
  memo,
  'โรงเรียนทดสอบ',
  'ศธ 123',
  'ครูทดสอบ',
  '2026-10-24'
);
function setup({
  authenticated = true,
  allowed = true,
  status = 'draft',
  found = true,
  race = false,
} = {}) {
  const calls = [];
  let doc = {
    id: 'document-id',
    school_id: 'school',
    created_by: 'actor',
    status,
    template_slug: 'memo',
    title: 'บันทึกข้อความ',
    purpose: '',
    content: sample,
  };
  const db = {
    from(table) {
      let write = false;
      let selectedId;
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          calls.push(['eq', key, value]);
          if (key === 'id') selectedId = value;
          return q;
        },
        order() {
          return q;
        },
        insert(values) {
          calls.push(['insert', values]);
          doc = { ...doc, ...values };
          return q;
        },
        update(values) {
          write = true;
          calls.push(['update', values]);
          doc = { ...doc, ...values };
          return q;
        },
        async single() {
          return { data: found ? doc : null, error: null };
        },
        async maybeSingle() {
          return {
            data: found && (!selectedId || selectedId === doc.id) && !(write && race) ? doc : null,
            error: null,
          };
        },
      };
      return q;
    },
  };
  const load = (path) => {
    const exports = {};
    vm.runInNewContext(compile(path), {
      exports,
      Date,
      require(name) {
        if (name === 'src/lib/auth-token')
          return {
            requireRole: () =>
              authenticated ? { schoolId: 'school', sub: 'actor', role: 'teacher' } : null,
          };
        if (name === 'src/lib/supabase-admin') return { supabaseAdmin: db };
        if (name === 'src/lib/department-permission-access')
          return { canViewViaPermission: async () => allowed };
        if (name === 'src/sections/documents/document-content') return content;
        if (name === 'src/sections/documents/document-catalog') return catalog;
        return require(name);
      },
    });
    return exports;
  };
  return {
    api: load('../src/app/api/documents/route.ts'),
    detail: load('../src/app/api/documents/[id]/route.ts'),
    calls,
  };
}
const request = (body, method = 'POST') =>
  new Request('http://localhost/api/documents', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const context = { params: Promise.resolve({ id: 'document-id' }) };
const body = { templateSlug: 'memo', title: 'เอกสารของฉัน', purpose: 'กิจกรรม', content: sample };
test('each template copy has independent editable sections', () => {
  const template = catalog.getSchoolDocumentTemplate('pp1');
  const first = content.templateDocumentContent(template);
  const second = content.templateDocumentContent(template);
  first.sections[0].text = 'เปลี่ยน';
  assert.notEqual(second.sections[0].text, 'เปลี่ยน');
  assert.equal(template.sections[0], 'ข้อมูลนักเรียน');
});
test('memo starts with school reference and sample text', () => {
  assert.equal(sample.documentNumber, 'ศธ 123/');
  assert.equal(sample.schoolName, 'โรงเรียนทดสอบ');
  assert.ok(sample.body.includes('จึงเรียนมา'));
  assert.equal(content.DocumentContentSchema.safeParse(sample).success, true);
});
test('document content rejects invalid dates and oversized content', () => {
  for (const patch of [{ documentDate: 'not-date' }, { body: 'x'.repeat(20001) }, { version: 2 }])
    assert.equal(content.DocumentContentSchema.safeParse({ ...sample, ...patch }).success, false);
});
test('creation saves editable content with server-controlled owner and school', async () => {
  const { api, calls } = setup();
  assert.equal(
    (await api.POST(request({ ...body, created_by: 'attacker', school_id: 'attacker' }))).status,
    201
  );
  const inserted = calls.find((call) => call[0] === 'insert')[1];
  assert.equal(inserted.created_by, 'actor');
  assert.equal(inserted.school_id, 'school');
  assert.equal(inserted.content.body, sample.body);
});
test('invalid content cannot be persisted', async () => {
  const { api, calls } = setup();
  assert.equal(
    (await api.POST(request({ ...body, content: { ...sample, body: 'x'.repeat(20001) } }))).status,
    400
  );
  assert.equal(
    calls.some((call) => call[0] === 'insert'),
    false
  );
});
test('loading an edited document is scoped to owner and school', async () => {
  const { detail, calls } = setup();
  const response = await detail.GET(new Request('http://localhost'), context);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).document.content.body, sample.body);
  assert.ok(
    calls.some((call) => call[0] === 'eq' && call[1] === 'created_by' && call[2] === 'actor')
  );
  assert.ok(
    calls.some((call) => call[0] === 'eq' && call[1] === 'school_id' && call[2] === 'school')
  );
});
test('submitted documents cannot be edited', async () => {
  const { detail, calls } = setup({ status: 'submitted' });
  assert.equal(
    (await detail.PATCH(request({ ...body, action: 'update' }, 'PATCH'), context)).status,
    409
  );
  assert.equal(
    calls.some((call) => call[0] === 'update'),
    false
  );
});
test('draft update saves text and protects against concurrent submission', async () => {
  const { detail, calls } = setup();
  assert.equal(
    (
      await detail.PATCH(
        request({ ...body, action: 'update', content: { ...sample, body: 'แก้ไขแล้ว' } }, 'PATCH'),
        context
      )
    ).status,
    200
  );
  assert.equal(calls.find((call) => call[0] === 'update')[1].content.body, 'แก้ไขแล้ว');
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'status' && call[2] === 'draft'));
  const stale = setup({ race: true });
  assert.equal(
    (await stale.detail.PATCH(request({ ...body, action: 'update' }, 'PATCH'), context)).status,
    409
  );
});
test('unauthorized callers cannot create or read documents', async () => {
  const { api, detail, calls } = setup({ allowed: false });
  assert.equal((await api.POST(request(body))).status, 403);
  assert.equal((await detail.GET(new Request('http://localhost'), context)).status, 403);
  assert.equal(calls.length, 0);
});

const reservationId = '99999999-9999-4999-8999-999999999999';
const reservation = {
  action: 'reserve',
  id: reservationId,
  templateSlug: 'memo',
  title: 'โครงการปีหน้า',
  purpose: 'เตรียมเอกสารไว้ก่อน',
  plannedDate: '2027-01-15',
};
test('explicit reservation numbers are saved and retries preserve the request', async () => {
  const { api, calls } = setup();
  const payload = { ...reservation, requestedSequence: '15' };
  assert.equal((await api.POST(request(payload))).status, 201);
  assert.equal(calls.find((call) => call[0] === 'insert')[1].requested_document_sequence, 15);
  assert.equal((await api.POST(request(payload))).status, 200);
  assert.equal((await api.POST(request({ ...payload, requestedSequence: '16' }))).status, 409);
});
test('invalid explicit reservation numbers are rejected before writing', async () => {
  for (const requestedSequence of ['0', '-1', '1.5', '1000000000000', 'abc', 15]) {
    const { api, calls } = setup();
    assert.equal((await api.POST(request({ ...reservation, requestedSequence }))).status, 400);
    assert.equal(
      calls.some((call) => call[0] === 'insert'),
      false
    );
  }
});
test('number can be reserved without content and with a future planned date', async () => {
  const { api, calls } = setup();
  const response = await api.POST(request(reservation));
  assert.equal(response.status, 201);
  const inserted = calls.find((call) => call[0] === 'insert')[1];
  assert.equal(inserted.status, 'reserved');
  assert.equal(inserted.content, null);
  assert.equal(inserted.planned_date, '2027-01-15');
  assert.equal(inserted.created_by, 'actor');
});
test('repeating a reservation does not create another document', async () => {
  const { api, calls } = setup();
  assert.equal((await api.POST(request(reservation))).status, 201);
  assert.equal((await api.POST(request(reservation))).status, 200);
  assert.equal(calls.filter((call) => call[0] === 'insert').length, 1);
});
test('reserved documents become drafts when their content is filled using the same record', async () => {
  const { detail, calls } = setup({ status: 'reserved' });
  assert.equal(
    (await detail.PATCH(request({ ...body, action: 'update' }, 'PATCH'), context)).status,
    200
  );
  const update = calls.find((call) => call[0] === 'update')[1];
  assert.equal(update.status, 'draft');
  assert.equal('document_sequence' in update, false);
  assert.equal('document_number' in update, false);
  assert.equal(
    calls.some((call) => call[0] === 'insert'),
    false
  );
});
test('reservations cannot be submitted before adding content, but can be cancelled', async () => {
  const { detail } = setup({ status: 'reserved' });
  assert.equal((await detail.PATCH(request({ action: 'submit' }, 'PATCH'), context)).status, 409);
  assert.equal((await detail.PATCH(request({ action: 'cancel' }, 'PATCH'), context)).status, 200);
});
test('reservation data must include a valid request ID and planned date', async () => {
  for (const patch of [{ id: 'bad' }, { plannedDate: 'invalid' }]) {
    const { api, calls } = setup();
    assert.equal((await api.POST(request({ ...reservation, ...patch }))).status, 400);
    assert.equal(
      calls.some((call) => call[0] === 'insert'),
      false
    );
  }
});

test('untyped reservations can be created and retried without choosing a template', async () => {
  for (const templateSlug of [undefined, '']) {
    const { api, calls } = setup();
    const payload = { ...reservation, templateSlug };
    assert.equal((await api.POST(request(payload))).status, 201);
    assert.equal((await api.POST(request(payload))).status, 200);
    assert.equal(calls.find((call) => call[0] === 'insert')[1].template_slug, '');
    assert.equal(calls.filter((call) => call[0] === 'insert').length, 1);
  }
});
test('normal documents still require a template and invalid reservation templates are rejected', async () => {
  const { api } = setup();
  assert.equal((await api.POST(request({ ...body, templateSlug: '' }))).status, 400);
  assert.equal((await api.POST(request({ ...reservation, templateSlug: 'invalid' }))).status, 400);
});
