import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { subjectCatalogInputSchema } from '../src/features/subject-catalog/schema.ts';
import { curriculumReferenceSchema } from '../src/features/curriculum/schema.ts';

test('accepts a personal catalog subject with structured indicators', () => {
  const parsed = subjectCatalogInputSchema.parse({
    name: 'คณิตศาสตร์ในชีวิตประจำวัน',
    scope: 'personal',
    status: 'draft',
    gradeLevels: ['ม.1'],
    indicators: [
      {
        code: 'ค 1.1 ม.1/1',
        description: 'ใช้สมบัติของจำนวนเต็มในการแก้ปัญหา',
      },
    ],
  });

  assert.equal(parsed.scope, 'personal');
  assert.equal(parsed.indicators[0]?.code, 'ค 1.1 ม.1/1');
});

test('does not let regular users create system catalog subjects', () => {
  const parsed = subjectCatalogInputSchema.safeParse({
    name: 'System subject',
    scope: 'system',
    status: 'published',
    indicators: [],
  });

  assert.equal(parsed.success, false);
});

test('requires real indicator code and description', () => {
  const parsed = subjectCatalogInputSchema.safeParse({
    name: 'รายวิชาทดสอบ',
    scope: 'public',
    status: 'published',
    indicators: [{ code: '', description: '' }],
  });

  assert.equal(parsed.success, false);
});

test('global catalog migration keeps school subjects and allows global ownership', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260804120000_global_subject_catalog.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /scope in \('system', 'personal', 'school', 'public'\)/);
  assert.match(migration, /alter column school_id drop not null/);
  assert.match(migration, /curriculum_indicators_visible_read_policy/);
});

test('the existing subject form is the single catalog creation surface', () => {
  const form = readFileSync(
    new URL('../src/sections/subject/view/subject-form-view.tsx', import.meta.url),
    'utf8'
  );
  const editPage = readFileSync(
    new URL('../src/app/teacher/subject/[id]/edit/page.tsx', import.meta.url),
    'utf8'
  );
  const listPage = readFileSync(
    new URL('../src/app/teacher/subject/page.tsx', import.meta.url),
    'utf8'
  );
  const createPage = readFileSync(
    new URL('../src/app/teacher/subject/new/page.tsx', import.meta.url),
    'utf8'
  );
  const legacyEditPage = readFileSync(
    new URL('../src/app/teacher/department-work/subject/[id]/edit/page.tsx', import.meta.url),
    'utf8'
  );
  const legacyCatalogPage = readFileSync(
    new URL('../src/app/teacher/lesson-plans/subject-catalog/page.tsx', import.meta.url),
    'utf8'
  );
  const teacherNav = readFileSync(
    new URL('../src/layouts/nav-config-teacher.tsx', import.meta.url),
    'utf8'
  );

  assert.match(form, /name="scope"/);
  assert.match(form, /useFieldArray/);
  assert.match(form, /curriculumIndicators\.\$\{index\}\.code/);
  assert.match(form, /router\.push\(basePath\)/);
  assert.match(listPage, /<SubjectListView basePath=\{paths\.teacher\.subjectRoot\}/);
  assert.match(createPage, /<SubjectFormView basePath=\{paths\.teacher\.subjectRoot\}/);
  assert.match(editPage, /<SubjectFormView/);
  assert.match(editPage, /subjectId=\{id\}/);
  assert.match(legacyEditPage, /redirect\(paths\.teacher\.subjectEdit\(id\)\)/);
  assert.match(legacyCatalogPage, /redirect\(paths\.teacher\.subjectNew\)/);
  assert.match(
    teacherNav,
    /title: 'คลังรายวิชา'[\s\S]*path: paths\.teacher\.subjectRoot/
  );
});

test('lesson plans and templates share one curriculum reference shape', () => {
  const subjectId = '11111111-1111-4111-8111-111111111111';
  const indicatorId = '22222222-2222-4222-8222-222222222222';
  const parsed = curriculumReferenceSchema.parse({
    curriculumId: null,
    subjectId,
    unitId: null,
    gradeLevels: ['ม.1', 'ม.1'],
    indicatorIds: [indicatorId],
    learningOutcomeIds: [],
  });

  assert.equal(parsed.subjectId, subjectId);
  assert.deepEqual(parsed.indicatorIds, [indicatorId]);
});

test('curriculum hierarchy migration adds reusable curricula, outcomes, and units', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260804140000_curriculum_hierarchy.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /create table if not exists public\.curricula/);
  assert.match(migration, /create table if not exists public\.subject_learning_outcomes/);
  assert.match(migration, /create table if not exists public\.subject_learning_units/);
  assert.match(migration, /add column if not exists curriculum_id uuid/);
  assert.match(migration, /add column if not exists learning_outcome_ids uuid\[\]/);
});

test('lesson plan links course outcomes and units without overwriting plan-specific content', () => {
  const form = readFileSync(
    new URL('../src/sections/lesson-plan/view/lesson-plan-form-view.tsx', import.meta.url),
    'utf8'
  );
  const applyCurriculum = form.slice(
    form.indexOf('const applyCurriculum'),
    form.indexOf('const selectAssignment')
  );

  assert.match(form, /name="unitId"/);
  assert.match(form, /name="learningOutcomeIds"/);
  assert.doesNotMatch(applyCurriculum, /setValue\('learningObjectives'/);
  assert.doesNotMatch(applyCurriculum, /setValue\('essentialContent'/);
});

test('subject classification uses one hierarchical master source', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260804150000_subject_master_hierarchy.sql', import.meta.url),
    'utf8'
  );
  const createRoute = readFileSync(
    new URL('../src/app/api/subjects/route.ts', import.meta.url),
    'utf8'
  );
  const form = readFileSync(
    new URL('../src/sections/subject/view/subject-form-view.tsx', import.meta.url),
    'utf8'
  );
  const masterRoute = readFileSync(
    new URL('../src/app/api/admin/subject-masters/route.ts', import.meta.url),
    'utf8'
  );

  assert.match(migration, /'grade_level'/);
  assert.match(migration, /'activity_type'/);
  assert.match(migration, /parent_code/);
  assert.match(createRoute, /parseSubjectClassification/);
  assert.doesNotMatch(createRoute, /VALID_GRADE_LEVELS/);
  assert.match(form, /item\.category === 'grade_level'/);
  assert.match(form, /item\.parent_code === educationStage/);
  assert.match(form, /scope === 'school' \? 'school' : 'global'/);
  assert.match(createRoute, /parseSubjectClassification\(caller, body\)/);
  assert.doesNotMatch(masterRoute, /canViewViaPermission/);
  assert.match(masterRoute, /requireRole\(request, \['school_admin', 'teacher'\]\)/);
});

test('learning standard keeps its code separate from the rich-text description', () => {
  const migration = readFileSync(
    new URL(
      '../supabase/migrations/20260804160000_subject_learning_standard_code.sql',
      import.meta.url
    ),
    'utf8'
  );
  const form = readFileSync(
    new URL('../src/sections/subject/view/subject-form-view.tsx', import.meta.url),
    'utf8'
  );
  const route = readFileSync(new URL('../src/app/api/subjects/route.ts', import.meta.url), 'utf8');

  assert.match(migration, /add column if not exists learning_standard_code text/);
  assert.match(form, /name="learningStandardCode"/);
  assert.match(form, /<Field\.Editor\s+name="learningStandards"/);
  assert.match(route, /learning_standard_code: learningStandardCode/);
});

test('lesson plan migration keeps canonical curriculum references and text snapshots', () => {
  const migration = readFileSync(
    new URL(
      '../supabase/migrations/20260804130000_lesson_plan_curriculum_references.sql',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(migration, /add column if not exists subject_id uuid/);
  assert.match(migration, /add column if not exists indicator_ids uuid\[\]/);
  assert.match(migration, /indicators text is the saved snapshot/);
});
