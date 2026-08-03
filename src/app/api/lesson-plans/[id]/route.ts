import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { loadTeacherAssignment } from 'src/lib/teacher-assignment-access';
import {
  ownsLessonPlan,
  loadLessonPlan,
  canViewLessonPlan,
  lessonPlanSnapshot,
} from 'src/lib/lesson-plan-access';

import {
  parseLessonPlanPayload,
  LESSON_PLAN_DRAFT_TAB_COLUMNS,
} from '../lesson-plan-payload';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  const { id } = await params;
  const plan = caller ? await loadLessonPlan(id) : null;
  if (!caller || !(await canViewLessonPlan(caller, plan))) {
    return NextResponse.json({ message: 'ไม่พบแผนการสอนหรือไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
  }

  const [{ data: versions }, { data: events }] = await Promise.all([
    supabaseAdmin
      .from('lesson_plan_versions')
      .select(
        'id, version_number, change_note, created_at, created_by:app_users!lesson_plan_versions_created_by_fkey(first_name, last_name)'
      )
      .eq('lesson_plan_id', id)
      .order('version_number', { ascending: false }),
    supabaseAdmin
      .from('lesson_plan_events')
      .select(
        'id, status, note, created_at, acted_by:app_users!lesson_plan_events_acted_by_fkey(first_name, last_name)'
      )
      .eq('lesson_plan_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    lessonPlan: { ...plan, versions: versions ?? [], events: events ?? [] },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher']);
  const { id } = await params;
  const plan = caller ? await loadLessonPlan(id) : null;
  if (!caller || !caller.schoolId || !ownsLessonPlan(caller, plan)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์แก้ไขแผนนี้' }, { status: 403 });
  }
  if (!['draft', 'revision'].includes(plan!.status)) {
    return NextResponse.json(
      { message: 'แก้ไขได้เฉพาะฉบับร่างหรือแผนที่ถูกส่งกลับ' },
      { status: 409 }
    );
  }

  const body = await request.json();
  const isDraftSave = body.saveMode === 'draft';
  const draftTab = typeof body.tab === 'string' ? body.tab : '';
  const payload = parseLessonPlanPayload(body, { allowIncomplete: isDraftSave });
  const expectedVersion = Number(body.expectedVersion);
  if (!payload || !Number.isInteger(expectedVersion) || expectedVersion !== plan!.version_number) {
    return NextResponse.json(
      { message: 'ข้อมูลหรือเวอร์ชันแผนไม่ถูกต้อง กรุณาโหลดใหม่' },
      { status: 409 }
    );
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

  const nextVersion = expectedVersion + 1;
  const updatePayload =
    isDraftSave && LESSON_PLAN_DRAFT_TAB_COLUMNS[draftTab]
      ? Object.fromEntries(
          LESSON_PLAN_DRAFT_TAB_COLUMNS[draftTab].map((column) => [
            column,
            payload[column as keyof typeof payload],
          ])
        )
      : payload;
  const nextSavedTabs =
    isDraftSave && LESSON_PLAN_DRAFT_TAB_COLUMNS[draftTab]
      ? [...new Set([...(plan!.saved_tabs ?? []), draftTab])]
      : plan!.saved_tabs;
  const { data: updated, error } = await supabaseAdmin
    .from('lesson_plans')
    .update({
      ...updatePayload,
      saved_tabs: nextSavedTabs,
      version_number: nextVersion,
      review_note: null,
    })
    .eq('id', id)
    .eq('teacher_id', caller.sub)
    .eq('version_number', expectedVersion)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json(
      { message: 'แผนถูกแก้ไขจากหน้าต่างอื่น กรุณาโหลดใหม่' },
      { status: 409 }
    );
  }

  await supabaseAdmin.from('lesson_plan_versions').insert({
    lesson_plan_id: id,
    version_number: nextVersion,
    snapshot: lessonPlanSnapshot(updated),
    change_note:
      typeof body.changeNote === 'string' && body.changeNote.trim()
        ? body.changeNote.trim().slice(0, 500)
        : 'แก้ไขแผนการสอน',
    created_by: caller.sub,
  });

  return NextResponse.json({ lessonPlan: updated });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher']);
  const { id } = await params;
  const plan = caller ? await loadLessonPlan(id) : null;
  if (!caller || !ownsLessonPlan(caller, plan)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ลบแผนนี้' }, { status: 403 });
  }
  if (plan!.status !== 'draft') {
    return NextResponse.json({ message: 'ลบได้เฉพาะแผนฉบับร่าง' }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from('lesson_plans')
    .delete()
    .eq('id', id)
    .eq('teacher_id', caller.sub);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
