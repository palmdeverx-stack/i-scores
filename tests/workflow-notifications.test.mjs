import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync('src/lib/workflow-notifications.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function setup({ status = 'submitted', kind = 'inventory_purchase', fail = false } = {}) {
  const calls = [];
  const exported = {};
  const event = {
    id: 'event',
    school_id: 'school',
    kind,
    source_id: 'source',
    status,
    owner_id: 'requester',
    actor_id: 'admin',
    title: 'Test',
    note: 'Reason',
  };
  const people = [
    { id: 'requester', role: 'teacher', username: 'owner' },
    { id: 'admin', role: 'school_admin', username: 'admin' },
    { id: 'viewer', role: 'teacher', username: 'viewer' },
  ];
  vm.runInNewContext(code, {
    exports: exported,
    Date,
    Promise,
    Map,
    console: { error: () => {} },
    require(name) {
      if (name === 'server-only') return {};
      if (name === 'node:crypto') return { randomUUID: () => 'lease' };
      if (name === './department-permission-access')
        return { canManageViaPermission: async (caller) => caller.sub === 'admin' };
      if (name === './lesson-plan-access')
        return { canReviewLessonPlans: async (caller) => caller.sub === 'admin' };
      if (name === './supabase-admin')
        return {
          supabaseAdmin: {
            rpc: async () => ({ data: [event], error: null }),
            from(table) {
              const call = { table };
              calls.push(call);
              const q = {
                select: () => q,
                eq: () => q,
                is: () => q,
                in: () => q,
                upsert: (rows, options) => {
                  call.rows = rows;
                  call.options = options;
                  return q;
                },
                update: (values) => {
                  call.values = values;
                  return q;
                },
                then: (resolve, reject) =>
                  Promise.resolve({
                    data: table === 'app_users' ? people : null,
                    error: fail && table === 'notifications' ? {} : null,
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
    flush: () => exported.flushWorkflowNotifications('school'),
    content: exported.workflowNotificationContent,
    calls,
    event,
  };
}
test('submitted requests notify permitted reviewers only and exclude the sender', async () => {
  const { flush, calls } = setup();
  await flush();
  const insert = calls.find((call) => call.rows);
  assert.deepEqual(
    Array.from(insert.rows, (row) => row.user_id),
    ['admin']
  );
  assert.equal(insert.rows[0].event_key, 'workflow:event');
  assert.equal(insert.options.ignoreDuplicates, true);
  assert.ok(calls.some((call) => call.values?.processed_at));
});
test('review outcomes go back to the requester and preserve the rejection reason', async () => {
  const { flush, calls } = setup({ status: 'rejected' });
  await flush();
  const insert = calls.find((call) => call.rows);
  assert.equal(insert.rows[0].user_id, 'requester');
  assert.match(insert.rows[0].body, /Reason/);
  assert.equal(insert.rows[0].link, '/teacher/inventory/purchases/source');
});
test('failed inserts are not acknowledged and their lease is released for retry', async () => {
  const { flush, calls } = setup({ fail: true });
  await flush();
  assert.equal(
    calls.some((call) => call.values?.processed_at),
    false
  );
  assert.ok(calls.some((call) => call.values?.claimed_until === null));
});
test('lesson revisions link the owner to their editable plan', async () => {
  const { content, event } = setup({ kind: 'lesson_plan', status: 'revision' });
  assert.equal(content(event, 'teacher').link, '/teacher/lesson-plans/source/edit');
});
