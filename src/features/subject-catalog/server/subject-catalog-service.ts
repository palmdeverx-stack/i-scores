import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';
import type { ParsedSubjectCatalogInput } from '../schema';
import type { SubjectCatalogEntry, SubjectCatalogScope } from '../types';

import { supabaseAdmin } from 'src/lib/supabase-admin';

const SUBJECT_SELECT = `
  id, school_id, created_by, curriculum_id, code, name, name_en, description,
  learning_area, subject_type, education_stage, grade_levels,
  learning_standard_code, learning_standards, learning_outcomes, learning_units, indicator_text:indicators,
  scope, status, created_at, updated_at,
  curriculum:curricula(id, school_id, owner_id, code, name, version, curriculum_type, scope, status)
`;

export function subjectVisibilityFilter(caller: AppTokenPayload) {
  const filters = [
    `created_by.eq.${caller.sub}`,
    'and(scope.eq.system,status.eq.published)',
    'and(scope.eq.public,status.eq.published)',
  ];
  if (caller.schoolId) filters.push(`and(scope.eq.school,school_id.eq.${caller.schoolId})`);
  return filters.join(',');
}

async function attachIndicators(
  caller: AppTokenPayload,
  subjects: Omit<SubjectCatalogEntry, 'indicators' | 'can_edit'>[]
) {
  const ids = subjects.map((subject) => subject.id);
  const [indicatorResult, outcomeResult, unitResult] = ids.length
    ? await Promise.all([
        supabaseAdmin
        .from('curriculum_indicators')
        .select('id, subject_id, code, description, learning_standard')
        .in('subject_id', ids)
        .order('code'),
        supabaseAdmin
          .from('subject_learning_outcomes')
          .select('id, subject_id, code, description, sequence')
          .in('subject_id', ids)
          .order('sequence'),
        supabaseAdmin
          .from('subject_learning_units')
          .select('id, subject_id, code, name, description, sequence, estimated_periods')
          .in('subject_id', ids)
          .order('sequence'),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (indicatorResult.error) throw indicatorResult.error;
  if (outcomeResult.error) throw outcomeResult.error;
  if (unitResult.error) throw unitResult.error;

  return subjects.map((subject) => ({
    ...subject,
    indicators: (indicatorResult.data ?? []).filter(
      (indicator) => indicator.subject_id === subject.id
    ),
    learning_outcomes_structured: (outcomeResult.data ?? []).filter(
      (outcome) => outcome.subject_id === subject.id
    ),
    learning_units_structured: (unitResult.data ?? []).filter(
      (unit) => unit.subject_id === subject.id
    ),
    can_edit:
      subject.scope !== 'system' &&
      (subject.created_by === caller.sub ||
        (subject.scope === 'school' && subject.school_id === caller.schoolId)),
  })) as SubjectCatalogEntry[];
}

export async function listVisibleSubjects(
  caller: AppTokenPayload,
  filters: { search?: string; scope?: SubjectCatalogScope; catalogOnly?: boolean } = {}
) {
  let query = supabaseAdmin
    .from('subjects')
    .select(SUBJECT_SELECT)
    .or(subjectVisibilityFilter(caller))
    .order('name');

  if (filters.catalogOnly) query = query.in('scope', ['system', 'personal', 'public']);
  if (filters.scope) query = query.eq('scope', filters.scope);
  if (filters.search) query = query.ilike('name', `%${filters.search.replaceAll('%', '\\%')}%`);

  const { data, error } = await query;
  if (error) throw error;
  return attachIndicators(
    caller,
    (data ?? []) as unknown as Omit<SubjectCatalogEntry, 'indicators' | 'can_edit'>[]
  );
}

export async function getVisibleSubject(caller: AppTokenPayload, id: string) {
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .select(SUBJECT_SELECT)
    .eq('id', id)
    .or(subjectVisibilityFilter(caller))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (
    await attachIndicators(caller, [
      data as unknown as Omit<SubjectCatalogEntry, 'indicators' | 'can_edit'>,
    ])
  )[0];
}

export async function syncIndicators(
  subjectId: string,
  input: ParsedSubjectCatalogInput['indicators'],
  schoolId: string | null = null
) {
  const suppliedIds = input.flatMap((indicator) => (indicator.id ? [indicator.id] : []));
  if (suppliedIds.length) {
    const { data: existing, error: ownershipError } = await supabaseAdmin
      .from('curriculum_indicators')
      .select('id, subject_id')
      .in('id', suppliedIds);
    if (ownershipError) throw ownershipError;
    if ((existing ?? []).some((indicator) => indicator.subject_id !== subjectId)) {
      throw new Error('ตัวชี้วัดไม่อยู่ในรายวิชานี้');
    }
  }

  const rows = input.map((indicator) => ({
    id: indicator.id ?? crypto.randomUUID(),
    subject_id: subjectId,
    school_id: schoolId,
    code: indicator.code,
    description: indicator.description,
    learning_standard: indicator.learningStandard || null,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length) {
    const { error } = await supabaseAdmin.from('curriculum_indicators').upsert(rows);
    if (error) throw error;
  }

  let deleteQuery = supabaseAdmin
    .from('curriculum_indicators')
    .delete()
    .eq('subject_id', subjectId);
  if (rows.length)
    deleteQuery = deleteQuery.not('id', 'in', `(${rows.map((row) => row.id).join(',')})`);
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;
}

type OutcomeInput = { id?: string; code?: string; description: string };
type UnitInput = {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  estimatedPeriods?: number;
};

async function replaceSubjectRows(
  table: 'subject_learning_outcomes' | 'subject_learning_units',
  subjectId: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length) {
    const { error } = await supabaseAdmin.from(table).upsert(rows);
    if (error) throw error;
  }
  let deletion = supabaseAdmin.from(table).delete().eq('subject_id', subjectId);
  if (rows.length) deletion = deletion.not('id', 'in', `(${rows.map((row) => row.id).join(',')})`);
  const { error } = await deletion;
  if (error) throw error;
}

export async function syncLearningOutcomes(subjectId: string, input: OutcomeInput[]) {
  await replaceSubjectRows(
    'subject_learning_outcomes',
    subjectId,
    input.map((outcome, sequence) => ({
      id: outcome.id ?? crypto.randomUUID(),
      subject_id: subjectId,
      code: outcome.code?.trim() || null,
      description: outcome.description.trim(),
      sequence,
      updated_at: new Date().toISOString(),
    }))
  );
}

export async function syncLearningUnits(subjectId: string, input: UnitInput[]) {
  await replaceSubjectRows(
    'subject_learning_units',
    subjectId,
    input.map((unit, sequence) => ({
      id: unit.id ?? crypto.randomUUID(),
      subject_id: subjectId,
      code: unit.code?.trim() || null,
      name: unit.name.trim(),
      description: unit.description?.trim() || null,
      estimated_periods: unit.estimatedPeriods || null,
      sequence,
      updated_at: new Date().toISOString(),
    }))
  );
}
