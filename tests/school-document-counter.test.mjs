import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = ts.transpileModule(
  readFileSync(new URL('../src/app/api/schools/[id]/route.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;
function setup({ role = 'school_admin', schoolId = 'school', error = null } = {}) {
  const calls = [];
  const db = {
    from() {
      const q = {
        select(fields) {
          calls.push(['select', fields]);
          return q;
        },
        eq() {
          return q;
        },
        update(values) {
          calls.push(['update', values]);
          return q;
        },
        async single() {
          return { data: error ? null : { id: 'school', document_sequence_current: 100 }, error };
        },
      };
      return q;
    },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === 'src/lib/auth-token') return { requireRole: () => ({ role, schoolId }) };
      if (name === 'src/lib/supabase-admin') return { supabaseAdmin: db };
      if (name === 'src/lib/security-audit') return { writeSecurityAudit: async () => {} };
      return require(name);
    },
  });
  return { ...exports, calls };
}
const context = { params: Promise.resolve({ id: 'school' }) };
const request = (body) =>
  new Request('http://localhost/api/schools/school', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
test('school administrators can set the last used document number', async () => {
  const api = setup();
  assert.equal((await api.PATCH(request({ documentSequenceCurrent: 100 }), context)).status, 200);
  assert.equal(api.calls.find((call) => call[0] === 'update')[1].document_sequence_current, 100);
});
test('invalid counters are rejected without updates', async () => {
  for (const value of [-1, 1.5, '100', 1000000000000]) {
    const api = setup();
    assert.equal(
      (await api.PATCH(request({ documentSequenceCurrent: value }), context)).status,
      400
    );
    assert.equal(
      api.calls.some((call) => call[0] === 'update'),
      false
    );
  }
});
test('school administrator cannot modify another school counter', async () => {
  const api = setup({ schoolId: 'other' });
  assert.equal((await api.PATCH(request({ documentSequenceCurrent: 100 }), context)).status, 403);
  assert.equal(api.calls.length, 0);
});
test('ordinary school edits leave the counter untouched', async () => {
  const api = setup();
  assert.equal((await api.PATCH(request({ name: 'โรงเรียนตัวอย่าง' }), context)).status, 200);
  assert.equal(
    'document_sequence_current' in api.calls.find((call) => call[0] === 'update')[1],
    false
  );
});
test('decreasing the counter produces a clear error', async () => {
  const api = setup({ error: { message: 'Document counter cannot go backwards' } });
  const response = await api.PATCH(request({ documentSequenceCurrent: 10 }), context);
  assert.equal(response.status, 409);
  assert.ok((await response.json()).message.includes('ไม่น้อยกว่า'));
});
