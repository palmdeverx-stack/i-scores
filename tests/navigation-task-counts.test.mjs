import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(
  readFileSync('src/app/api/navigation/task-counts/route.ts', 'utf8'),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }
).outputText;
function setup({
  authenticated = true,
  docs = false,
  manage = false,
  approve = false,
  lessons = false,
  review = false,
  fail = false,
} = {}) {
  const queries = [];
  const caller = { sub: 'actor', schoolId: 'school', role: 'teacher' };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    Promise,
    require(name) {
      if (name === 'next/server')
        return {
          NextResponse: {
            json: (body, init) => ({ body, status: init?.status ?? 200, headers: init?.headers }),
          },
        };
      if (name.endsWith('/auth-token'))
        return { requireRole: () => (authenticated ? caller : null) };
      if (name.endsWith('/department-permission-access'))
        return {
          canViewViaPermission: async () => docs,
          canManageViaPermission: async (_caller, key) =>
            key === 'inventory.manage' ? manage : approve,
        };
      if (name.endsWith('/lesson-plan-feature-access'))
        return { requireLessonPlanFeature: async () => (lessons ? caller : null) };
      if (name.endsWith('/lesson-plan-access')) return { canReviewLessonPlans: async () => review };
      if (name.endsWith('/supabase-admin'))
        return {
          supabaseAdmin: {
            from(table) {
              const filters = [];
              queries.push({ table, filters });
              const q = {
                select: () => q,
                eq: (key, value) => {
                  filters.push([key, value]);
                  return q;
                },
                neq: (key, value) => {
                  filters.push(['exclude:' + key, value]);
                  return q;
                },
                in: (key, value) => {
                  filters.push([key, value]);
                  return q;
                },
                then: (resolve, reject) =>
                  Promise.resolve({ count: 3, error: fail ? {} : null }).then(resolve, reject),
              };
              return q;
            },
          },
        };
      throw new Error(name);
    },
  });
  return { get: () => exports.GET({}), queries };
}
test('unauthenticated callers cannot read counts', async () => {
  const { get, queries } = setup({ authenticated: false });
  assert.equal((await get()).status, 403);
  assert.equal(queries.length, 0);
});
test('no permission means no queries or counts', async () => {
  const { get, queries } = setup();
  assert.equal(Object.keys((await get()).body.counts).length, 0);
  assert.equal(queries.length, 0);
});
test('incoming review counts are school scoped and exclude own submissions', async () => {
  const { get, queries } = setup({ approve: true, lessons: true, review: true });
  const response = await get();
  assert.equal(response.body.counts['/lesson-plan-reviews'], 3);
  assert.match(response.headers['Cache-Control'], /no-store/);
  for (const query of queries) {
    assert.ok(query.filters.some(([key, value]) => key === 'school_id' && value === 'school'));
    assert.ok(
      query.filters.some(
        ([key, value]) =>
          ['exclude:teacher_id', 'exclude:created_by'].includes(key) && value === 'actor'
      )
    );
    assert.ok(
      query.filters.some(([key, value]) => key === 'status' && value.join() === 'submitted')
    );
  }
});
test('approval queues require approval permission and count submitted issues only', async () => {
  const { get, queries } = setup({ approve: true });
  const response = await get();
  assert.equal(response.body.counts['/inventory/purchase-approvals'], 3);
  assert.equal(response.body.counts['/inventory/receive'], undefined);
  const issues = queries.find((q) => q.table === 'inventory_documents');
  assert.ok(issues.filters.some(([key, value]) => key === 'kind' && value === 'issue'));
  assert.ok(
    issues.filters.some(([key, value]) => key === 'status' && value.join() === 'submitted')
  );
});
test('database failure is reported instead of presenting zero pending work', async () => {
  const { get } = setup({ approve: true, fail: true });
  assert.equal((await get()).status, 503);
});
test('own drafts, reservations and operational backlog do not produce badges', async () => {
  const { get, queries } = setup({ docs: true, manage: true, lessons: true });
  const response = await get();
  assert.equal(Object.keys(response.body.counts).length, 0);
  assert.equal(queries.length, 0);
});
