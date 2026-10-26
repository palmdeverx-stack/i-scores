import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function setup({
  licensed = true,
  active = true,
  schoolOnly = false,
  authUserId = null,
  archived = false,
} = {}) {
  const calls = [];
  const exports = {};
  const db = {
    from(table) {
      calls.push(['table', table]);
      let inserted = false;
      const q = {
        select: () => q,
        eq: (...args) => {
          calls.push(['eq', table, ...args]);
          return q;
        },
        is: (...args) => {
          calls.push(['is', table, ...args]);
          return q;
        },
        lte: (...args) => {
          calls.push(['lte', table, ...args]);
          return q;
        },
        gt: (...args) => {
          calls.push(['gt', table, ...args]);
          return q;
        },
        contains: (...args) => {
          calls.push(['contains', table, ...args]);
          return q;
        },
        limit: () => q,
        insert: (row) => {
          inserted = true;
          calls.push(['insert', table, row]);
          return q;
        },
        maybeSingle: async () => ({
          data:
            table === 'ekru_apps'
              ? {
                  id: 'app',
                  code: 'CHAT_AI',
                  name: 'Chat AI',
                  launch_path: '/apps/chat-ai',
                  required_feature_key: 'teacher.chat_ai',
                  supported_scope: schoolOnly ? 'school' : 'individual',
                }
              : table === 'marketplace_users'
                ? { id: 'buyer', auth_user_id: authUserId, is_active: true }
                : table === 'marketplace_user_licenses'
                  ? licensed
                    ? { id: 'license' }
                    : null
                  : table === 'ekru_app_workspaces'
                    ? archived
                      ? { id: 'workspace', status: 'archived' }
                      : null
                    : null,
        }),
        single: async () => ({ data: inserted ? { id: 'isolated-workspace' } : null }),
      };
      return q;
    },
  };
  vm.runInNewContext(
    ts.transpileModule(readFileSync('src/lib/ekru-app-access.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      Date,
      require(name) {
        if (name === 'server-only') return {};
        if (name === './supabase-admin') return { supabaseAdmin: db };
        if (name === './session-security')
          return { getSessionStatus: async () => (active ? 'active' : 'inactive') };
        throw new Error(name);
      },
    }
  );
  return {
    run: () =>
      exports.resolveEkruAppAccess(
        { sub: 'buyer', username: 'buyer', role: 'marketplace_user', schoolId: null },
        { code: 'CHAT_AI' }
      ),
    calls,
  };
}
test('Marketplace buyer without Auth UUID uses the purchased app in an isolated Marketplace-owned workspace', async () => {
  const s = setup();
  const result = await s.run();
  assert.equal(result.allowed, true);
  assert.equal(result.access.scope, 'individual');
  assert.equal(result.access.schoolId, null);
  const insert = s.calls.find((c) => c[0] === 'insert')[2];
  assert.equal(insert.owner_marketplace_user_id, 'buyer');
  assert.equal(insert.owner_auth_user_id, null);
  assert.equal(insert.school_id, null);
  assert.ok(!s.calls.some((c) => c[0] === 'table' && c[1] === 'app_users'));
  assert.ok(
    s.calls.some(
      (c) =>
        c[0] === 'eq' &&
        c[1] === 'marketplace_user_licenses' &&
        c[2] === 'buyer_id' &&
        c[3] === 'buyer'
    )
  );
  assert.ok(s.calls.some((c) => c[0] === 'lte' && c[2] === 'starts_at'));
  assert.ok(s.calls.some((c) => c[0] === 'gt' && c[2] === 'expires_at'));
  assert.ok(s.calls.some((c) => c[0] === 'contains' && c[2] === 'feature_keys'));
});
for (const options of [
  { licensed: false },
  { active: false },
  { schoolOnly: true },
  { archived: true },
])
  test(
    'license, session, school scope and archived workspace restrictions are enforced ' +
      JSON.stringify(options),
    async () => {
      const s = setup(options);
      assert.equal((await s.run()).allowed, false);
      assert.ok(!s.calls.some((c) => c[0] === 'insert'));
    }
  );
test('existing Auth-owned workspaces keep the original owner identity', async () => {
  const s = setup({ authUserId: 'auth-user' });
  assert.equal((await s.run()).allowed, true);
  const insert = s.calls.find((c) => c[0] === 'insert')[2];
  assert.equal(insert.owner_auth_user_id, 'auth-user');
  assert.equal(insert.owner_marketplace_user_id, null);
});
