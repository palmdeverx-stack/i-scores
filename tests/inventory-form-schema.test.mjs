import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../src/sections/inventory/inventory-schema.ts', import.meta.url),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, require, File });
const schema = exports.InventoryItemSchema;
const valid = {
  item_type: 'material',
  material_subtype: 'consumable',
  code: 'P001',
  name: 'กระดาษ',
  category: 'สำนักงาน',
  unit: 'รีม',
  location: '',
  description: '',
  brand: '',
  model: '',
  specifications: '',
  barcode: '',
  reference_price: 0,
  supplier: '',
  notes: '',
  minimum_stock: 0,
  maximum_stock: 0,
  image: null,
};
test('accepts zero stock and zero price and trims input', () => {
  const parsed = schema.parse({ ...valid, code: '  P001  ', name: '  กระดาษ  ' });
  assert.equal(parsed.code, 'P001');
  assert.equal(parsed.name, 'กระดาษ');
});
test('required fields fail at their field paths', () => {
  for (const key of ['name', 'category', 'unit']) {
    const result = schema.safeParse({ ...valid, [key]: ' ' });
    assert.equal(result.success, false);
    assert.ok(result.error.issues.some((issue) => issue.path[0] === key));
  }
});
test('rejects invalid money and stock counts', () => {
  for (const patch of [
    { reference_price: -1 },
    { reference_price: 1.234 },
    { reference_price: undefined },
    { minimum_stock: 1.5 },
    { minimum_stock: -1 },
    { minimum_stock: undefined },
    { reference_price: Infinity },
  ]) {
    assert.equal(schema.safeParse({ ...valid, ...patch }).success, false);
  }
  assert.equal(
    schema.safeParse({ ...valid, reference_price: 123.45, minimum_stock: 5 }).success,
    true
  );
});
test('enforces field length limits', () => {
  for (const patch of [
    { code: 'x'.repeat(61) },
    { description: 'x'.repeat(4001) },
    { supplier: 'x'.repeat(201) },
  ]) {
    assert.equal(schema.safeParse({ ...valid, ...patch }).success, false);
  }
});
test('validates optional image files', () => {
  assert.equal(
    schema.safeParse({ ...valid, image: new File(['photo'], 'photo.png', { type: 'image/png' }) })
      .success,
    true
  );
  for (const image of [
    new File([], 'empty.png', { type: 'image/png' }),
    new File(['svg'], 'x.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(5242881)], 'large.png', { type: 'image/png' }),
  ]) {
    assert.equal(schema.safeParse({ ...valid, image }).success, false);
  }
});

test('new item code may be empty because the database generates it', () => {
  assert.equal(schema.safeParse({ ...valid, code: '' }).success, true);
});

test('MAX must be zero (unset) or at least MIN', () => {
  assert.equal(schema.safeParse({ ...valid, minimum_stock: 10, maximum_stock: 5 }).success, false);
  assert.equal(schema.safeParse({ ...valid, minimum_stock: 10, maximum_stock: 10 }).success, true);
  assert.equal(schema.safeParse({ ...valid, minimum_stock: 10, maximum_stock: 0 }).success, true);
  assert.equal(schema.safeParse({ ...valid, maximum_stock: 1.5 }).success, false);
});
const stockSource = readFileSync(
  new URL('../src/sections/inventory/inventory-stock.ts', import.meta.url),
  'utf8'
);
const stock = {};
vm.runInNewContext(
  ts.transpileModule(stockSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
  { exports: stock }
);
test('stock alerts honor MIN boundary, empty priority and MAX target', () => {
  const item = { quantity: 0, minimum_stock: 5, maximum_stock: 20 };
  assert.equal(stock.inventoryStockStatus(item).key, 'out');
  assert.equal(stock.inventoryStockStatus({ ...item, quantity: 5 }).key, 'low');
  assert.equal(stock.inventoryStockStatus({ ...item, quantity: 6 }).key, 'normal');
  assert.equal(stock.inventoryStockStatus({ ...item, quantity: 20 }).key, 'normal');
  assert.equal(stock.inventoryStockStatus({ ...item, quantity: 21 }).key, 'over');
  assert.equal(stock.inventoryReplenishment({ ...item, quantity: 5 }), 15);
  assert.equal(stock.inventoryReplenishment({ ...item, quantity: 21 }), 0);
  assert.equal(stock.inventoryReplenishment({ ...item, maximum_stock: 0 }), null);
});

test('equipment and consumable materials use consistent types', () => {
  assert.equal(
    schema.safeParse({ ...valid, item_type: 'equipment', material_subtype: null }).success,
    true
  );
  assert.equal(
    schema.safeParse({ ...valid, item_type: 'equipment', material_subtype: 'consumable' }).success,
    false
  );
  assert.equal(
    schema.safeParse({ ...valid, item_type: 'material', material_subtype: null }).success,
    false
  );
});
