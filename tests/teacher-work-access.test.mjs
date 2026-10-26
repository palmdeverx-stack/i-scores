import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function setup({ view = [], manage = [] } = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync('src/lib/teacher-work-access.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      URL,
      require(name) {
        if (name === 'server-only') return {};
        if (name === './department-permission-access')
          return {
            getDepartmentGrantedPermissions: async () => view,
            getEffectiveDepartmentPermissions: async () => manage,
          };
        throw new Error(name);
      },
    }
  );
  return exports;
}
const caller = { sub: 'teacher', role: 'teacher', schoolId: 'school' };
const request = (path, method = 'GET') => ({ url: `https://app.test${path}`, method });
test('read access never grants score or assignment writes through direct API calls', async () => {
  const api = setup({ view: ['teaching.assignments'] });
  assert.equal(
    await api.canAccessTeacherWork(request('/api/teacher-assignments/id/assignments'), caller),
    true
  );
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE'])
    assert.equal(
      await api.canAccessTeacherWork(request('/api/assignments/id/scores', method), caller),
      false
    );
});
test('scan writes require attendance manage rather than course view permissions', async () => {
  const viewOnly = setup({ view: ['teaching.attendance', 'teaching.assignments'] });
  assert.equal(
    await viewOnly.canAccessTeacherWork(request('/api/teacher/attendance-scan/sessions'), caller),
    true
  );
  assert.equal(
    await viewOnly.canAccessTeacherWork(
      request('/api/teacher/attendance-scan/sessions/id/scan', 'POST'),
      caller
    ),
    false
  );
  assert.equal(
    await setup({ manage: ['teaching.attendance'] }).canAccessTeacherWork(
      request('/api/teacher/attendance-scan/sessions/id/scan', 'POST'),
      caller
    ),
    true
  );
});
test('delegated timetable managers retain timetable-management APIs without teaching rights', async () => {
  const api = setup({ view: ['schedule.manage'], manage: ['schedule.manage'] });
  assert.equal(await api.canAccessTeacherWork(request('/api/teacher-assignments'), caller), true);
  assert.equal(
    await api.canAccessTeacherWork(
      request('/api/teacher-assignments/id/schedules', 'POST'),
      caller
    ),
    true
  );
  assert.equal(
    await api.canAccessTeacherWork(request('/api/teacher-assignments/id', 'PATCH'), caller),
    true
  );
  assert.equal(
    await api.canAccessTeacherWork(
      request('/api/teacher-assignments/id/assignments', 'POST'),
      caller
    ),
    false
  );
});
test('school announcement managers retain their shared API while view-only users cannot post', async () => {
  const manager = setup({ view: ['announcements.manage'], manage: ['announcements.manage'] });
  assert.equal(
    await manager.canAccessTeacherWork(request('/api/teacher/announcements', 'POST'), caller),
    true
  );
  const viewer = setup({ view: ['announcements.manage'] });
  assert.equal(
    await viewer.canAccessTeacherWork(request('/api/teacher/announcements'), caller),
    true
  );
  assert.equal(
    await viewer.canAccessTeacherWork(request('/api/teacher/announcements', 'POST'), caller),
    false
  );
});
test('lesson reviewers do not borrow teaching creation rights and owners do not borrow review rights', async () => {
  const reviewer = setup({ view: ['lesson_plans.review'], manage: ['lesson_plans.review'] });
  assert.equal(
    await reviewer.canAccessTeacherWork(request('/api/lesson-plans?scope=review'), caller),
    true
  );
  assert.equal(
    await reviewer.canAccessTeacherWork(request('/api/lesson-plans?scope=mine'), caller),
    false
  );
  assert.equal(
    await reviewer.canAccessTeacherWork(request('/api/lesson-plans', 'POST'), caller),
    false
  );
  const teacher = setup({ view: ['teaching.assignments'], manage: ['teaching.assignments'] });
  assert.equal(
    await teacher.canAccessTeacherWork(request('/api/lesson-plans?scope=review'), caller),
    false
  );
  assert.equal(
    await teacher.canAccessTeacherWork(request('/api/lesson-plans', 'POST'), caller),
    true
  );
});
test('capability gate supplements original role checks and leaves unrelated shared APIs unchanged', async () => {
  const api = setup();
  assert.equal(await api.canAccessTeacherWork(request('/api/teacher/timetable'), caller), false);
  assert.equal(
    await api.canAccessTeacherWork(request('/api/teacher/timetable'), {
      ...caller,
      role: 'school_admin',
    }),
    true
  );
  assert.equal(await api.canAccessTeacherWork(request('/api/notifications'), caller), true);
});
