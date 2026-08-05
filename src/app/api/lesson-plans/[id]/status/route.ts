import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { requireLessonPlanFeature } from 'src/lib/lesson-plan-feature-access';
import { isPersonalWorkspaceOwner } from 'src/lib/department-permission-access';
import { ownsLessonPlan, loadLessonPlan, canReviewLessonPlans } from 'src/lib/lesson-plan-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };
type LessonPlanStatus = 'draft' | 'submitted' | 'revision' | 'approved' | 'archived';

const ACTION_STATUS: Record<string, LessonPlanStatus> = {
  submit: 'submitted',
  revision: 'revision',
  approve: 'approved',
  archive: 'archived',
};

const ALLOWED_FROM: Record<string, LessonPlanStatus[]> = {
  submit: ['draft', 'revision'],
  revision: ['submitted'],
  approve: ['submitted'],
  archive: ['approved'],
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = await requireLessonPlanFeature(request, ['teacher', 'school_admin']);
  const { id } = await params;
  const plan = caller ? await loadLessonPlan(id) : null;
  if (!caller?.schoolId || !plan || plan.school_id !== caller.schoolId) {
    return NextResponse.json({ message: 'ไม่พบแผนการสอน' }, { status: 404 });
  }
  if (
    caller.role === 'teacher' &&
    (await isPersonalWorkspaceOwner(caller.sub, caller.schoolId))
  ) {
    return NextResponse.json(
      { message: 'พื้นที่ส่วนตัวไม่มีขั้นตอนส่งตรวจแผนการสอน' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const action = typeof body.action === 'string' ? body.action : '';
  const nextStatus = ACTION_STATUS[action];
  if (!nextStatus || !ALLOWED_FROM[action]?.includes(plan.status as LessonPlanStatus)) {
    return NextResponse.json({ message: 'สถานะปัจจุบันไม่รองรับการดำเนินการนี้' }, { status: 409 });
  }

  const isOwnerAction = action === 'submit' || action === 'archive';
  const allowed = isOwnerAction
    ? ownsLessonPlan(caller, plan)
    : await canReviewLessonPlans(caller, true);
  if (!allowed) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });
  }

  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : null;
  if (action === 'revision' && !note) {
    return NextResponse.json({ message: 'กรุณาระบุสิ่งที่ต้องแก้ไข' }, { status: 400 });
  }
  if (
    action === 'submit' &&
    (!plan.title?.trim() ||
      !plan.unit_name?.trim() ||
      !plan.learning_objectives ||
      !plan.learning_activities ||
      !plan.assessment)
  ) {
    return NextResponse.json(
      { message: 'กรุณากรอกข้อมูลทั่วไป จุดประสงค์ กิจกรรม และการวัดผลก่อนส่งตรวจ' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const values: Record<string, unknown> = { status: nextStatus, review_note: note };
  if (nextStatus === 'submitted') Object.assign(values, { submitted_at: now });
  if (nextStatus === 'revision' || nextStatus === 'approved') {
    Object.assign(values, { reviewed_by: caller.sub, reviewed_at: now });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('lesson_plans')
    .update(values)
    .eq('id', id)
    .eq('status', plan.status)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ message: 'สถานะแผนถูกเปลี่ยนแล้ว กรุณาโหลดใหม่' }, { status: 409 });
  }

  await supabaseAdmin.from('lesson_plan_events').insert({
    lesson_plan_id: id,
    status: nextStatus,
    note,
    acted_by: caller.sub,
  });

  return NextResponse.json({ lessonPlan: updated });
}
