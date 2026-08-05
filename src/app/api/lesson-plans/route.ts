import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { loadTeacherAssignment } from 'src/lib/teacher-assignment-access';
import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import {
  LESSON_PLAN_SELECT,
  lessonPlanSnapshot,
  canReviewLessonPlans,
} from 'src/lib/lesson-plan-access';
import {
  CurriculumReferenceError,
  resolveCurriculumReference,
} from 'src/features/curriculum/server/resolve-curriculum-reference';

import {
  parseLessonPlanPayload,
  LESSON_PLAN_DRAFT_TAB_COLUMNS,
} from './lesson-plan-payload';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const caller = await requireLessonPlanFeature(request, ['teacher', 'school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const requestedScope = new URL(request.url).searchParams.get('scope');
  const scope =
    requestedScope === 'review' || requestedScope === 'templates' ? requestedScope : 'mine';
  const canReview = scope === 'review' ? await canReviewLessonPlans(caller) : false;
  if (scope === 'review' && !canReview) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ตรวจแผนการสอน' }, { status: 403 });
  }
  if (scope === 'mine' && caller.role !== 'teacher') {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึงแผนส่วนตัว' }, { status: 403 });
  }

  let query = supabaseAdmin
    .from('lesson_plans')
    .select(LESSON_PLAN_SELECT)
    .eq('school_id', caller.schoolId)
    .order('updated_at', { ascending: false });
  if (scope === 'mine') query = query.eq('teacher_id', caller.sub);
  if (scope === 'review') query = query.neq('status', 'draft');
  if (scope === 'templates') query = query.eq('status', 'approved');

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  const canManage = scope === 'review' ? await canReviewLessonPlans(caller, true) : false;
  return NextResponse.json({ lessonPlans: data ?? [], canManage });
}

export async function POST(request: Request) {
  const caller = await requireLessonPlanFeature(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์สร้างแผนการสอน' }, { status: 403 });
  }

  const body = await request.json();
  const isDraftSave =
    body && typeof body === 'object' && (body as Record<string, unknown>).saveMode === 'draft';
  const draftTab =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).tab === 'string'
      ? String((body as Record<string, unknown>).tab)
      : '';
  const payload = parseLessonPlanPayload(body, { allowIncomplete: isDraftSave });
  if (!payload) {
    return NextResponse.json({ message: 'กรุณากรอกข้อมูลแผนการสอนให้ครบถ้วน' }, { status: 400 });
  }

  const assignment = await loadTeacherAssignment(payload.teacher_assignment_id);
  const assignmentSchoolId = (assignment?.classrooms as unknown as { school_id: string } | null)
    ?.school_id;
  if (
    !assignment ||
    assignment.teacher_id !== caller.sub ||
    assignmentSchoolId !== caller.schoolId
  ) {
    return NextResponse.json({ message: 'ไม่พบรายวิชาที่คุณได้รับมอบหมาย' }, { status: 404 });
  }

  const assignmentSubjectId = String(assignment.subject_id);
  const classroomGrade = (assignment.classrooms as unknown as { grade_level: string | null })
    ?.grade_level;
  let curriculum;
  try {
    curriculum = await resolveCurriculumReference(
      caller,
      {
        curriculumId: payload.curriculum_id,
        subjectId: payload.subject_id,
        unitId: payload.unit_id,
        gradeLevels: payload.grade_levels.length
          ? payload.grade_levels
          : classroomGrade
            ? [classroomGrade]
            : [],
        indicatorIds: payload.indicator_ids,
        learningOutcomeIds: payload.learning_outcome_ids,
      },
      assignmentSubjectId
    );
  } catch (curriculumError) {
    if (curriculumError instanceof CurriculumReferenceError) {
      return NextResponse.json({ message: curriculumError.message }, { status: 400 });
    }
    throw curriculumError;
  }

  const { data: plan, error } = await supabaseAdmin
    .from('lesson_plans')
    .insert({
      ...payload,
      subject_id: curriculum.subjectId,
      curriculum_id: curriculum.curriculumId,
      unit_id: curriculum.unitId,
      grade_levels: curriculum.gradeLevels,
      indicator_ids: curriculum.indicatorIds,
      learning_outcome_ids: curriculum.learningOutcomeIds,
      school_id: caller.schoolId,
      teacher_id: caller.sub,
      saved_tabs:
        isDraftSave && LESSON_PLAN_DRAFT_TAB_COLUMNS[draftTab] ? [draftTab] : [],
    })
    .select('*')
    .single();
  if (error || !plan) {
    return NextResponse.json(
      { message: error?.message ?? 'สร้างแผนการสอนไม่สำเร็จ' },
      { status: 500 }
    );
  }

  await Promise.all([
    supabaseAdmin.from('lesson_plan_versions').insert({
      lesson_plan_id: plan.id,
      version_number: 1,
      snapshot: lessonPlanSnapshot(plan),
      change_note: 'สร้างแผนการสอน',
      created_by: caller.sub,
    }),
    supabaseAdmin.from('lesson_plan_events').insert({
      lesson_plan_id: plan.id,
      status: 'draft',
      note: 'สร้างแผนการสอน',
      acted_by: caller.sub,
    }),
  ]);

  return NextResponse.json({ lessonPlan: plan }, { status: 201 });
}
