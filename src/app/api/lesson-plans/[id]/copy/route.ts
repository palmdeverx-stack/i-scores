import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { ownsLessonPlan, loadLessonPlan, lessonPlanSnapshot } from 'src/lib/lesson-plan-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher']);
  const { id } = await params;
  const source = caller ? await loadLessonPlan(id) : null;
  if (!caller?.schoolId || !source || !ownsLessonPlan(caller, source)) {
    return NextResponse.json({ message: 'ไม่พบแผนต้นฉบับ' }, { status: 404 });
  }

  const copyFields = {
    school_id: caller.schoolId,
    teacher_id: caller.sub,
    teacher_assignment_id: source.teacher_assignment_id,
    subject_id: source.subject_id,
    curriculum_id: source.curriculum_id,
    unit_id: source.unit_id,
    grade_levels: source.grade_levels,
    indicator_ids: source.indicator_ids,
    learning_outcome_ids: source.learning_outcome_ids,
    copied_from_id: source.id,
    title: `สำเนา ${source.title}`.slice(0, 200),
    unit_number: source.unit_number,
    unit_name: source.unit_name,
    duration_periods: source.duration_periods,
    start_date: source.start_date,
    end_date: source.end_date,
    learning_standards: source.learning_standards,
    indicators: source.indicators,
    learning_objectives: source.learning_objectives,
    essential_content: source.essential_content,
    learner_competencies: source.learner_competencies,
    desired_characteristics: source.desired_characteristics,
    guiding_questions: source.guiding_questions,
    learning_activities: source.learning_activities,
    learning_media: source.learning_media,
    assessment: source.assessment,
    saved_tabs: source.saved_tabs,
    status: 'draft',
    version_number: 1,
  };
  const { data: copied, error } = await supabaseAdmin
    .from('lesson_plans')
    .insert(copyFields)
    .select('*')
    .single();
  if (error || !copied) {
    return NextResponse.json({ message: error?.message ?? 'คัดลอกแผนไม่สำเร็จ' }, { status: 500 });
  }

  await Promise.all([
    supabaseAdmin.from('lesson_plan_versions').insert({
      lesson_plan_id: copied.id,
      version_number: 1,
      snapshot: lessonPlanSnapshot(copied),
      change_note: `คัดลอกจาก ${source.title}`.slice(0, 500),
      created_by: caller.sub,
    }),
    supabaseAdmin.from('lesson_plan_events').insert({
      lesson_plan_id: copied.id,
      status: 'draft',
      note: 'สร้างจากสำเนา',
      acted_by: caller.sub,
    }),
  ]);

  return NextResponse.json({ lessonPlan: copied }, { status: 201 });
}
