import 'server-only';

import type { AppTokenPayload } from './auth-token';

import { supabaseAdmin } from './supabase-admin';
import {
  canViewViaPermission,
  canManageViaPermission,
  isPersonalWorkspaceOwner,
} from './department-permission-access';

// ----------------------------------------------------------------------

export const LESSON_PLAN_SELECT = `
  id, school_id, teacher_id, teacher_assignment_id, curriculum_id, subject_id, unit_id,
  grade_levels, indicator_ids, learning_outcome_ids, copied_from_id,
  title, unit_number, unit_name, duration_periods, start_date, end_date,
  learning_standards, indicators, milestone_indicators, terminal_indicators,
  template_section_contents,
  learning_objectives, essential_content,
  learner_competencies, desired_characteristics, guiding_questions, learning_activities,
  learning_media, assessment, saved_tabs, status, version_number,
  submitted_at, reviewed_at, review_note, created_at, updated_at,
  teacher:app_users!lesson_plans_teacher_id_fkey(id, first_name, last_name, username),
  reviewer:app_users!lesson_plans_reviewed_by_fkey(id, first_name, last_name),
  teacher_assignment:teacher_assignments!lesson_plans_teacher_assignment_id_fkey(
    id, teacher_id,
    subject:subjects(id, curriculum_id, code, name, learning_area, grade_levels, scope,
      learning_standard_code, learning_standards, learning_outcomes, indicators, learning_units,
      curriculum:curricula(id, school_id, owner_id, code, name, version, curriculum_type, scope, status),
      curriculum_indicators(id, subject_id, code, description, learning_standard),
      learning_outcomes_structured:subject_learning_outcomes(id, subject_id, code, description, sequence),
      learning_units_structured:subject_learning_units(id, subject_id, code, name, description, sequence, estimated_periods)),
    classroom:classrooms(id, name, grade_level, academic_year:academic_years(year)),
    semester:semesters(id, name)
  )
`;

export async function loadLessonPlan(id: string) {
  const { data } = await supabaseAdmin
    .from('lesson_plans')
    .select(LESSON_PLAN_SELECT)
    .eq('id', id)
    .maybeSingle();
  return data;
}

export function ownsLessonPlan(caller: AppTokenPayload, plan: { teacher_id: string } | null) {
  return caller.role === 'teacher' && plan?.teacher_id === caller.sub;
}

export async function canViewLessonPlan(
  caller: AppTokenPayload,
  plan: Awaited<ReturnType<typeof loadLessonPlan>>
) {
  if (!plan || !caller.schoolId || plan.school_id !== caller.schoolId) return false;
  if (ownsLessonPlan(caller, plan)) return true;
  return canViewViaPermission(caller, 'lesson_plans.review');
}

export async function canReviewLessonPlans(caller: AppTokenPayload, manage = false) {
  if (
    caller.role === 'teacher' &&
    caller.schoolId &&
    (await isPersonalWorkspaceOwner(caller.sub, caller.schoolId))
  ) {
    return false;
  }
  return manage
    ? canManageViaPermission(caller, 'lesson_plans.review')
    : canViewViaPermission(caller, 'lesson_plans.review');
}

export function lessonPlanSnapshot(plan: Record<string, unknown>) {
  const fields = [
    'teacher_assignment_id',
    'subject_id',
    'curriculum_id',
    'unit_id',
    'grade_levels',
    'indicator_ids',
    'learning_outcome_ids',
    'title',
    'unit_number',
    'unit_name',
    'duration_periods',
    'start_date',
    'end_date',
    'learning_standards',
    'indicators',
    'milestone_indicators',
    'terminal_indicators',
    'template_section_contents',
    'learning_objectives',
    'essential_content',
    'learner_competencies',
    'desired_characteristics',
    'guiding_questions',
    'learning_activities',
    'learning_media',
    'assessment',
    'saved_tabs',
    'status',
  ] as const;

  return Object.fromEntries(fields.map((field) => [field, plan[field] ?? null]));
}
