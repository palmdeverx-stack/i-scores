import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Map,
    Set,
    require(name) {
      if (name === 'react/jsx-runtime')
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (name === 'src/components/remix-icon')
        return new Proxy({}, { get: (_target, key) => String(key) });
      if (name === 'src/routes/paths') return load('src/routes/paths.ts');
      if (name === 'src/sections/documents/document-catalog')
        return load('src/sections/documents/document-catalog.ts');
      if (name === 'src/lib/workspace-access') return load('src/lib/workspace-access.ts');
      if (name === './organize-school-navigation')
        return load('src/layouts/organize-school-navigation.ts');
      if (name === './nav-config-inventory') return load('src/layouts/nav-config-inventory.tsx');
      return require(name);
    },
  });
  return exports;
}
const { hasWorkspacePermission } = load('src/lib/workspace-access.ts');
const { filterNavByDepartment, filterAdminNavForTeacher, groupPersonalWorkspaceNav } = load(
  'src/sections/teacher-department/filter-nav-by-department.ts'
);
const { organizeSchoolNavigation } = load('src/layouts/organize-school-navigation.ts');
const teacher = load('src/layouts/nav-config-teacher.tsx').navData;
const admin = load('src/layouts/nav-config-dashboard.tsx').navData;
const master = load('src/layouts/nav-config-master.tsx').navData;
const flatten = (data) => data.flatMap((group) => walk(group.items));
const walk = (items) =>
  items.flatMap((item) => [item, ...(item.children ? walk(item.children) : [])]);
const paths = (data) => Array.from(flatten(data), (item) => item.path);
test('view and manage levels are distinct and role boundaries fail closed', () => {
  assert.equal(
    hasWorkspacePermission(
      { role: 'teacher', department_permissions: ['inventory.manage'] },
      'inventory.manage',
      'manage'
    ),
    false
  );
  assert.equal(
    hasWorkspacePermission(
      { role: 'teacher', manage_permissions: ['inventory.manage'] },
      'inventory.manage',
      'view'
    ),
    true
  );
  assert.equal(
    hasWorkspacePermission(
      {
        role: 'student',
        department_permissions: ['inventory.manage'],
        manage_permissions: ['inventory.manage'],
      },
      'inventory.manage'
    ),
    false
  );
  assert.equal(hasWorkspacePermission({ role: 'master_admin' }, 'inventory.manage'), false);
  assert.equal(hasWorkspacePermission({ role: 'school_admin' }, undefined, 'manage'), true);
  assert.equal(hasWorkspacePermission({ role: 'teacher' }, undefined), false);
});
test('teacher menus separate approvals from operational stock work for both school roles', () => {
  for (const data of [teacher, admin]) {
    const approval = data.find((group) => group.subheader === 'งานตรวจสอบและอนุมัติ');
    assert.ok(approval);
    assert.ok(approval.items.some((item) => item.path.endsWith('/inventory/purchase-approvals')));
    assert.ok(approval.items.some((item) => item.path.endsWith('/lesson-plan-reviews')));
    const inventory = data.find((group) => group.subheader === 'งานพัสดุ');
    assert.ok(inventory);
    assert.equal(
      walk(inventory.items).some(
        (item) => item.path.endsWith('/approvals') || item.path.endsWith('/purchase-approvals')
      ),
      false
    );
    assert.ok(walk(inventory.items).some((item) => item.path.endsWith('/returns')));
  }
});
test('view-only staff see the permitted inventory menus with a read-only explanation', () => {
  const visible = filterNavByDepartment(teacher, [], ['inventory.manage'], false, []);
  const inventory = flatten(visible).filter((item) => item.path.startsWith('/teacher/inventory'));
  assert.ok(inventory.length);
  assert.ok(inventory.every((item) => item.caption?.includes('ดูข้อมูลเท่านั้น')));
  assert.equal(paths(visible).includes('/teacher/inventory/approvals'), false);
});
test('an approver can receive approval menus without access to operational stock screens', () => {
  const visible = filterNavByDepartment(teacher, [], ['inventory.approve'], false, [
    'inventory.approve',
  ]);
  assert.ok(paths(visible).includes('/teacher/inventory/approvals'));
  assert.equal(paths(visible).includes('/teacher/inventory'), false);
  assert.equal(paths(visible).includes('/teacher/inventory/receive'), false);
});
test('parent permission and roles cannot be bypassed by a child and empty groups are removed', () => {
  const data = [
    {
      subheader: 'Test',
      items: [
        {
          title: 'Parent',
          path: '/parent',
          requiresDepartmentPermission: 'inventory.manage',
          children: [{ title: 'Child', path: '/child' }],
        },
      ],
    },
  ];
  assert.equal(filterNavByDepartment(data, [], [], false, []).length, 0);
  assert.equal(filterAdminNavForTeacher(data, [], false, []).length, 0);
  data[0].items[0].allowedRoles = ['school_admin'];
  assert.equal(
    filterNavByDepartment(data, [], ['inventory.manage'], false, ['inventory.manage']).length,
    0
  );
});
test('manage-only navigation entries require individual manage rights even when inherited', () => {
  const data = [
    {
      items: [
        {
          title: 'Stock',
          path: '/stock',
          requiresDepartmentPermission: 'inventory.manage',
          children: [{ title: 'New', path: '/stock/new', permissionAccess: 'manage' }],
        },
      ],
    },
  ];
  assert.equal(filterNavByDepartment(data, [], ['inventory.manage'], false, []).length, 0);
  assert.ok(
    paths(
      filterNavByDepartment(data, [], ['inventory.manage'], false, ['inventory.manage'])
    ).includes('/stock/new')
  );
});
test('organization preserves routes and personal grouping uses paths rather than renamed titles', () => {
  const data = [
    {
      subheader: 'Old',
      items: [
        { title: 'Renamed school year', path: '/teacher/department-work/academic-year' },
        { title: 'Renamed plans', path: '/teacher/lesson-plans' },
        { title: 'Renamed docs', path: '/teacher/documents' },
        { title: 'Future', path: '/teacher/future' },
      ],
    },
  ];
  const organized = organizeSchoolNavigation(data, 'teacher');
  assert.deepEqual(paths(organized).sort(), paths(data).sort());
  const personal = groupPersonalWorkspaceNav(organized);
  assert.ok(
    personal
      .find((group) => group.subheader === 'เตรียมการสอน')
      .items.some((item) => item.path.endsWith('/academic-year'))
  );
  assert.deepEqual(paths(personal).sort(), paths(data).sort());
});
test('director status alone does not grant approval rights, and explicit personal grants do', () => {
  assert.equal(
    paths(filterNavByDepartment(teacher, [], [], true, [])).includes('/teacher/schedule-approvals'),
    false
  );
  assert.ok(
    paths(
      filterNavByDepartment(teacher, [], ['schedule.approve'], false, ['schedule.approve'])
    ).includes('/teacher/schedule-approvals')
  );
});
test('master menus stay role-bound and grouped separately from school workflows', () => {
  assert.ok(master.some((group) => group.subheader === 'ดูแลโรงเรียนและบัญชี'));
  assert.ok(flatten(master).every((item) => item.allowedRoles?.includes('master_admin')));
  assert.equal(
    flatten(master).some((item) => item.path.startsWith('/teacher')),
    false
  );
});
