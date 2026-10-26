import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const compile = (path) =>
  ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const catalog = {};
vm.runInNewContext(compile('src/lib/department-permissions-config.ts'), { exports: catalog });
function setup({ type = [], overrides = [], granted = [], delegated = [], foreign = false } = {}) {
  const exported = {};
  const calls = [];
  vm.runInNewContext(compile('src/lib/department-permission-access.ts'), {
    exports: exported,
    Set,
    Promise,
    require(name) {
      if (name === 'server-only') return {};
      if (name === './department-permissions-config') return catalog;
      if (name === './supabase-admin')
        return {
          supabaseAdmin: {
            from(table) {
              const call = { table, filters: [] };
              calls.push(call);
              const result = {
                app_users: { auth_user_id: 'auth', staff_type: 'teacher' },
                schools: { workspace_type: 'school' },
                department_members: {
                  id: 'member',
                  department_id: 'department',
                  department: { school_id: foreign ? 'other' : 'school' },
                },
                staff_type_permissions: type,
                staff_permission_overrides: overrides,
                department_permissions: granted.map((permission_key) => ({ permission_key })),
                department_member_permissions: delegated.map((permission_key) => ({
                  permission_key,
                })),
              }[table];
              const q = {
                select: () => q,
                eq: (key, value) => {
                  call.filters.push([key, value]);
                  return q;
                },
                maybeSingle: async () => ({ data: result, error: null }),
                then: (resolve, reject) =>
                  Promise.resolve({ data: result, error: null }).then(resolve, reject),
              };
              return q;
            },
          },
        };
      return require(name);
    },
  });
  return { api: exported, calls };
}
test('individual none overrides both staff-type manage and department delegation', async () => {
  const { api } = setup({
    type: [{ permission_key: 'inventory.manage', access_level: 'manage' }],
    granted: ['inventory.manage'],
    delegated: ['inventory.manage'],
    overrides: [{ permission_key: 'inventory.manage', access_level: 'none' }],
  });
  assert.equal(
    (await api.getDepartmentGrantedPermissions('actor', 'school')).includes('inventory.manage'),
    false
  );
  assert.equal(
    (await api.getEffectiveDepartmentPermissions('actor', 'school')).includes('inventory.manage'),
    false
  );
});
test('individual view downgrades manage while individual manage can explicitly delegate an action', async () => {
  const { api } = setup({
    type: [{ permission_key: 'inventory.manage', access_level: 'manage' }],
    overrides: [
      { permission_key: 'inventory.manage', access_level: 'view' },
      { permission_key: 'inventory.approve', access_level: 'manage' },
    ],
  });
  const view = await api.getDepartmentGrantedPermissions('actor', 'school');
  const manage = await api.getEffectiveDepartmentPermissions('actor', 'school');
  assert.ok(view.includes('inventory.manage'));
  assert.equal(manage.includes('inventory.manage'), false);
  assert.ok(manage.includes('inventory.approve'));
});
test('membership alone grants department view; writes require individual delegation', async () => {
  const { api } = setup({ granted: ['inventory.manage'] });
  assert.ok(
    (await api.getDepartmentGrantedPermissions('actor', 'school')).includes('inventory.manage')
  );
  assert.equal(
    (await api.getEffectiveDepartmentPermissions('actor', 'school')).includes('inventory.manage'),
    false
  );
  const delegated = setup({ granted: ['inventory.manage'], delegated: ['inventory.manage'] });
  assert.ok(
    (await delegated.api.getEffectiveDepartmentPermissions('actor', 'school')).includes(
      'inventory.manage'
    )
  );
});
test('foreign-school membership does not grant department access', async () => {
  const { api } = setup({
    foreign: true,
    granted: ['inventory.manage'],
    delegated: ['inventory.manage'],
  });
  assert.equal(
    (await api.getDepartmentGrantedPermissions('actor', 'school')).includes('inventory.manage'),
    false
  );
  assert.equal(
    (await api.getEffectiveDepartmentPermissions('actor', 'school')).includes('inventory.manage'),
    false
  );
});
test('grade-review compatibility must not restore an approval permission explicitly denied to the person', async () => {
  const { api } = setup({
    type: [{ permission_key: 'grades.review', access_level: 'manage' }],
    overrides: [{ permission_key: 'grades.approve', access_level: 'none' }],
  });
  const view = await api.getDepartmentGrantedPermissions('actor', 'school');
  assert.ok(view.includes('grades.review'));
  assert.equal(view.includes('grades.approve'), false);
});
