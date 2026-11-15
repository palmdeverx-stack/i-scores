import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('src/lib/master-marketplace-customers.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { loadMasterMarketplaceCustomers } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);
const now = Date.parse('2026-11-15T00:00:00Z');
const buyer = (id, name = id) => ({
  id,
  username: name,
  email: `${id}@example.com`,
  first_name: name,
  last_name: null,
  is_active: true,
});
const license = (id, extra = {}) => ({
  id,
  buyer_id: 'buyer',
  order_item_id: `item-${id}`,
  grants_plan_code: 'PERSONAL',
  feature_keys: ['teacher.test'],
  starts_at: '2026-11-01T00:00:00Z',
  expires_at: '2026-12-01T00:00:00Z',
  status: 'active',
  ...extra,
});

function database(tables, failure) {
  return {
    from(table) {
      let rows = tables[table] ?? [];
      const query = {
        select() {
          return query;
        },
        order() {
          rows = [...rows].sort((a, b) => a.id.localeCompare(b.id));
          return query;
        },
        in(key, values) {
          rows = rows.filter((row) => values.includes(row[key]));
          return query;
        },
        eq(key, value) {
          rows = rows.filter((row) =>
            key === 'school.workspace_type'
              ? row.school?.workspace_type === value
              : row[key] === value
          );
          return query;
        },
        async range(from, to) {
          return {
            data: rows.slice(from, to + 1),
            error: table === failure ? { message: 'database unavailable' } : null,
          };
        },
      };
      return query;
    },
  };
}

test('includes personal purchases and legacy buyers, excludes school purchases, searches names and plans', async () => {
  const db = database({
    marketplace_user_licenses: [license('a'), license('b', { buyer_id: 'legacy' })],
    marketplace_school_licenses: [
      license('personal', { order_id: 'personal-order', school: { workspace_type: 'personal' } }),
      license('school', { order_id: 'school-order', school: { workspace_type: 'school' } }),
    ],
    marketplace_orders: [
      { id: 'personal-order', buyer_id: 'buyer' },
      { id: 'school-order', buyer_id: 'school-buyer' },
    ],
    marketplace_users: [buyer('buyer', 'สมชาย')],
    app_users: [buyer('legacy')],
  });
  const result = await loadMasterMarketplaceCustomers(db, 0, '', now);
  assert.equal(result.total, 3);
  assert.equal(result.purchases.filter((row) => row.workspace_type === 'personal').length, 1);
  assert.equal(
    result.purchases.find((row) => row.buyer_profile_id === 'legacy').email,
    'legacy@example.com'
  );
  assert.equal((await loadMasterMarketplaceCustomers(db, 0, 'สมชาย', now)).total, 2);
  assert.equal((await loadMasterMarketplaceCustomers(db, 0, 'personal', now)).total, 3);
  assert.equal((await loadMasterMarketplaceCustomers(db, 0, 'missing', now)).total, 0);
});

test('loads past database batch limits and paginates after filtering', async () => {
  const db = database({
    marketplace_user_licenses: Array.from({ length: 501 }, (_, i) =>
      license(String(i).padStart(4, '0'))
    ),
    marketplace_users: [buyer('buyer')],
  });
  const result = await loadMasterMarketplaceCustomers(db, 20, '', now);
  assert.equal(result.total, 501);
  assert.equal(result.purchases.length, 1);
  assert.equal(result.purchases[0].id, 'individual:0500');
});

test('computes expiration without overriding refunded licenses', async () => {
  const db = database({
    marketplace_user_licenses: [
      license('expired', { expires_at: '2026-10-01T00:00:00Z' }),
      license('future', { starts_at: '2026-11-20T00:00:00Z' }),
      license('refunded', { status: 'refunded', expires_at: '2026-10-01T00:00:00Z' }),
    ],
    marketplace_users: [buyer('buyer')],
  });
  const result = await loadMasterMarketplaceCustomers(db, 0, '', now);
  const statuses = new Map(result.purchases.map((row) => [row.id, row.status]));
  assert.equal(statuses.get('individual:expired'), 'expired');
  assert.equal(statuses.get('individual:future'), 'pending');
  assert.equal(statuses.get('individual:refunded'), 'refunded');
});

test('reports database failures instead of returning an empty customer list', async () => {
  await assert.rejects(
    loadMasterMarketplaceCustomers(database({}, 'marketplace_user_licenses'), 0, '', now),
    /database unavailable/
  );
});
