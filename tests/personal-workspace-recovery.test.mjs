import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function compile(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    Date,
    Set,
    Map,
  });
  return exports;
}
const resolver = compile('src/lib/personal-license-plan.ts');
const features = ['teacher.manage_subjects', 'teacher.lesson_plans'];

function setup({ failPlans = false, unmapped = false } = {}) {
  const calls = [];
  const mutations = [];
  const db = {
    from(table) {
      const many = () => ({
        data:
          table === 'marketplace_user_licenses'
            ? [
                {
                  order_item_id: 'item',
                  product_id: 'product',
                  grants_plan_code: null,
                  feature_keys: features,
                  expires_at: '2099-01-01T00:00:00Z',
                },
              ]
            : table === 'marketplace_products'
              ? [{ id: 'product', grants_plan_code: null }]
              : table === 'subscription_plans'
                ? unmapped
                  ? []
                  : [
                      {
                        code: 'PERSONAL',
                        target_scope: 'individual',
                        enabled_features: [...features, 'teacher.qr_attendance'],
                      },
                    ]
                : [],
        error:
          table === 'subscription_plans' && failPlans ? { message: 'plan lookup failed' } : null,
      });
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        in() {
          return q;
        },
        lte() {
          return q;
        },
        gt() {
          return q;
        },
        is() {
          return q;
        },
        update() {
          mutations.push(table);
          return q;
        },
        upsert() {
          mutations.push(table);
          return q;
        },
        async maybeSingle() {
          return {
            data:
              table === 'marketplace_users'
                ? { id: 'buyer' }
                : table === 'schools'
                  ? { id: 'workspace' }
                  : { id: 'teacher', school_id: 'workspace', role: 'teacher' },
            error: null,
          };
        },
        async single() {
          return { data: { id: table }, error: null };
        },
        then(resolve, reject) {
          return Promise.resolve(many()).then(resolve, reject);
        },
      };
      return q;
    },
    async rpc(name, payload) {
      calls.push({ name, payload });
      return { data: {}, error: null };
    },
  };
  const recovery = compile('src/lib/personal-workspace-provisioning.ts', {
    'server-only': {},
    './supabase-admin': { supabaseAdmin: db },
    './school-subscription-config': { ALL_SCHOOL_FEATURE_KEYS: features },
    './personal-license-plan': resolver,
  });
  return { ...recovery, calls, mutations };
}

test('recovery uses a covering plan but provisions only purchased features', async () => {
  const recovery = setup();
  const result = await recovery.recoverPersonalWorkspacePurchases('auth-user');
  assert.equal(result.count, 1);
  assert.equal(recovery.calls[0].name, 'provision_personal_workspace_purchase');
  assert.equal(recovery.calls[0].payload.p_plan_code, 'PERSONAL');
  assert.deepEqual(recovery.calls[0].payload.p_feature_keys, features);
  assert.equal(recovery.calls[0].payload.p_feature_keys.includes('teacher.qr_attendance'), false);
});

test('plan lookup failures propagate before provisioning or workspace writes', async () => {
  const recovery = setup({ failPlans: true });
  await assert.rejects(
    recovery.recoverPersonalWorkspacePurchases('auth-user'),
    /plan lookup failed/
  );
  assert.equal(recovery.calls.length, 0);
  assert.equal(recovery.mutations.length, 0);
});

test('unmappable licenses fail before any workspace writes', async () => {
  const recovery = setup({ unmapped: true });
  await assert.rejects(
    recovery.recoverPersonalWorkspacePurchases('auth-user'),
    /ไม่พบแพ็กเกจรายบุคคล/
  );
  assert.equal(recovery.calls.length, 0);
  assert.equal(recovery.mutations.length, 0);
});
