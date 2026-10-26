import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const code = ts.transpileModule(
  readFileSync('src/app/api/access-permissions/[id]/navigation/route.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;
const id = '99999999-9999-4999-8999-999999999999';
function setup({ allowed = true, found = true, foreignMembership = false } = {}) {
  const exports = {};
  const calls = [];
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
        return {
          requireRole: () =>
            allowed ? { role: 'school_admin', schoolId: 'school', sub: 'admin' } : null,
        };
      if (name.endsWith('/department-permission-access'))
        return {
          getDepartmentGrantedPermissions: async (user, school) => {
            calls.push(['view', user, school]);
            return ['inventory.manage'];
          },
          getEffectiveDepartmentPermissions: async () => [],
          isPersonalWorkspaceOwner: async () => false,
        };
      if (name.endsWith('/supabase-admin'))
        return {
          supabaseAdmin: {
            from(table) {
              const call = { table, filters: [] };
              calls.push(call);
              const q = {
                select: () => q,
                eq: (key, value) => {
                  call.filters.push([key, value]);
                  return q;
                },
                maybeSingle: async () => ({
                  data: found
                    ? {
                        id,
                        role: 'teacher',
                        is_active: true,
                        is_school_director: false,
                        username: 'teacher',
                      }
                    : null,
                  error: null,
                }),
                then: (resolve, reject) =>
                  Promise.resolve({
                    data: [
                      {
                        role_in_department: 'member',
                        department: {
                          id: 'dept',
                          name: 'Dept',
                          school_id: foreignMembership ? 'other' : 'school',
                        },
                      },
                    ],
                    error: null,
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
    get: (userId = id) => exports.GET({}, { params: Promise.resolve({ id: userId }) }),
    calls,
  };
}
test('only school administrators can preview another person menus', async () => {
  const { get, calls } = setup({ allowed: false });
  assert.equal((await get()).status, 403);
  assert.equal(calls.length, 0);
});
test('profile lookup is confined to a teacher in the administrators school', async () => {
  const { get, calls } = setup();
  const response = await get();
  assert.equal(response.status, 200);
  const profile = calls.find((call) => call.table === 'app_users');
  assert.ok(profile.filters.some(([key, value]) => key === 'school_id' && value === 'school'));
  assert.ok(profile.filters.some(([key, value]) => key === 'role' && value === 'teacher'));
  assert.equal(response.body.user.department_permissions[0], 'inventory.manage');
  assert.equal(response.body.user.manage_permissions.length, 0);
  assert.match(response.headers['Cache-Control'], /no-store/);
});
test('missing profiles are rejected before resolving their permissions', async () => {
  const { get, calls } = setup({ found: false });
  assert.equal((await get()).status, 404);
  assert.equal(
    calls.some((call) => Array.isArray(call)),
    false
  );
});
test('foreign memberships are never exposed in the preview', async () => {
  const { get } = setup({ foreignMembership: true });
  assert.equal((await get()).body.user.departments.length, 0);
});
test('malformed IDs are rejected before querying profiles', async () => {
  const { get, calls } = setup();
  assert.equal((await get('invalid')).status, 400);
  assert.equal(calls.length, 0);
});
