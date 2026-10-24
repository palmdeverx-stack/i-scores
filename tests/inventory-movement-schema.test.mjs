import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../src/sections/inventory/inventory-movement-schema.ts', import.meta.url),
  'utf8'
);
const exports = {};
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require }
);
const item = { id: '33333333-3333-4333-8333-333333333333', quantity: 5, unit: 'ชิ้น' };
const values = { item_id: item.id, quantity: 1, recipient: 'ครู', note: '' };
const receive = exports.createInventoryMovementSchema('receive', [item]);
const issue = exports.createInventoryMovementSchema('issue', [item]);
test('receive accepts positive quantity without a supplier', () => {
  assert.equal(receive.safeParse({ ...values, recipient: '', quantity: 20 }).success, true);
});
test('issue requires recipient and does not exceed available stock', () => {
  assert.equal(issue.safeParse({ ...values, recipient: ' ' }).success, false);
  const result = issue.safeParse({ ...values, quantity: 6 });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((entry) => entry.path[0] === 'quantity'));
  assert.equal(issue.safeParse({ ...values, quantity: 5 }).success, true);
});
test('both forms reject invalid quantities', () => {
  for (const schema of [receive, issue])
    for (const quantity of [0, -1, 1.5, undefined, Infinity]) {
      assert.equal(schema.safeParse({ ...values, quantity }).success, false);
    }
});
test('unrecognized or foreign-school items cannot be submitted', () => {
  for (const schema of [receive, issue]) {
    assert.equal(
      schema.safeParse({ ...values, item_id: '44444444-4444-4444-8444-444444444444' }).success,
      false
    );
  }
});
test('empty stock cannot be issued', () => {
  const schema = exports.createInventoryMovementSchema('issue', [{ ...item, quantity: 0 }]);
  assert.equal(schema.safeParse(values).success, false);
});
test('recipient and notes are trimmed and length limited', () => {
  assert.equal(issue.parse({ ...values, recipient: ' ครู ', note: ' ทดสอบ ' }).recipient, 'ครู');
  assert.equal(receive.safeParse({ ...values, note: 'x'.repeat(1001) }).success, false);
  assert.equal(issue.safeParse({ ...values, recipient: 'x'.repeat(201) }).success, false);
});

const second = { ...item, id: '44444444-4444-4444-8444-444444444444', quantity: 3 };
const documentValues = {
  reference_number: 'INV-001',
  document_date: '2026-10-24',
  recipient: 'ครู',
  note: 'ใช้ในห้องเรียน',
  lines: [
    { item_id: item.id, quantity: 2 },
    { item_id: second.id, quantity: 3 },
  ],
};
test('issue requests allow unavailable quantities until approval checks actual stock', () => {
  const schema = exports.createInventoryDocumentSchema('issue', [item, second]);
  assert.equal(schema.safeParse(documentValues).success, true);
  const result = schema.safeParse({
    ...documentValues,
    lines: [documentValues.lines[0], { item_id: second.id, quantity: 4 }],
  });
  assert.equal(result.success, true);
});
test('document prevents duplicates and requires between 1 and 100 lines', () => {
  const schema = exports.createInventoryDocumentSchema('receive', [item, second]);
  for (const lines of [
    [],
    [documentValues.lines[0], documentValues.lines[0]],
    Array.from({ length: 101 }, () => documentValues.lines[0]),
  ]) {
    assert.equal(schema.safeParse({ ...documentValues, lines }).success, false);
  }
});
test('multi-line issues still require a recipient', () => {
  assert.equal(
    exports
      .createInventoryDocumentSchema('issue', [item, second])
      .safeParse({ ...documentValues, recipient: ' ' }).success,
    false
  );
  assert.equal(
    exports
      .createInventoryDocumentSchema('receive', [item, second])
      .safeParse({ ...documentValues, recipient: '' }).success,
    true
  );
});

test('equipment cannot be requested through the consumable issue workflow', () => {
  const equipment = { ...item, item_type: 'equipment', quantity: 2 };
  const issueSchema = exports.createInventoryDocumentSchema('issue', [equipment]);
  assert.equal(
    issueSchema.safeParse({ ...documentValues, lines: [{ item_id: item.id, quantity: 1 }] })
      .success,
    false
  );
  const receiveSchema = exports.createInventoryDocumentSchema('receive', [equipment]);
  assert.equal(
    receiveSchema.safeParse({ ...documentValues, lines: [{ item_id: item.id, quantity: 1 }] })
      .success,
    true
  );
});
