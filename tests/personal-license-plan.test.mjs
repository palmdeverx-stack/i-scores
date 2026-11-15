import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('src/lib/personal-license-plan.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { resolvePersonalLicensePlan } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);
const features = ['teacher.manage_subjects', 'teacher.lesson_plans'];
const license = { grants_plan_code: null, feature_keys: features };
const plan = (code, enabled_features, target_scope = 'individual') => ({
  code,
  enabled_features,
  target_scope,
});

test('legacy feature subset maps to the smallest covering personal plan without mutating the license', () => {
  assert.equal(
    resolvePersonalLicensePlan(license, null, [
      plan('LARGE', [...features, 'teacher.qr_attendance', 'teacher.assignments']),
      plan('SMALL', [...features, 'teacher.qr_attendance']),
      plan('SCHOOL', features, 'school'),
    ]),
    'SMALL'
  );
  assert.deepEqual(license.feature_keys, features);
});

test('exact sets win regardless of order or duplicates', () => {
  assert.equal(
    resolvePersonalLicensePlan(license, null, [
      plan('BROAD', [...features, 'teacher.qr_attendance']),
      plan('EXACT', [...features].reverse()),
    ]),
    'EXACT'
  );
  assert.equal(
    resolvePersonalLicensePlan({ ...license, feature_keys: [...features, features[0]] }, null, [
      plan('EXACT', features),
    ]),
    'EXACT'
  );
});

test('explicit license and product codes keep their precedence', () => {
  assert.equal(
    resolvePersonalLicensePlan({ ...license, grants_plan_code: 'LICENSE' }, 'PRODUCT', []),
    'LICENSE'
  );
  assert.equal(resolvePersonalLicensePlan(license, 'PRODUCT', []), 'PRODUCT');
});

test('does not infer a plan from partial overlaps, school-only plans or empty purchases', () => {
  assert.equal(
    resolvePersonalLicensePlan(license, null, [
      plan('PARTIAL', [features[0]]),
      plan('SCHOOL', features, 'school'),
    ]),
    null
  );
  assert.equal(
    resolvePersonalLicensePlan({ ...license, feature_keys: [] }, null, [plan('ANY', features)]),
    null
  );
});

test('ties resolve consistently and both-scope plans are supported', () => {
  const a = plan('A', [...features, 'teacher.qr_attendance'], 'both');
  const b = plan('B', [...features, 'teacher.assignments']);
  assert.equal(resolvePersonalLicensePlan(license, null, [b, a]), 'A');
  assert.equal(resolvePersonalLicensePlan(license, null, [a, b]), 'A');
});
