import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };
const TYPES = ['general', 'holiday', 'exam'];
const PRIORITIES = ['normal', 'important', 'urgent'];

async function getOwnedAnnouncement(id: string, teacherId: string, schoolId: string) {
  return supabaseAdmin
    .from('school_announcements')
    .select('id')
    .eq('id', id)
    .eq('created_by', teacherId)
    .eq('school_id', schoolId)
    .maybeSingle();
}

async function getAllowedClassroomIds(teacherId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from('teacher_assignments')
    .select('classroom:classrooms!inner(id, school_id)')
    .eq('teacher_id', teacherId)
    .eq('classrooms.school_id', schoolId);
  if (error) throw new Error(error.message);

  return new Set(
    data.map((row) => (row.classroom as unknown as { id: string }).id).filter(Boolean)
  );
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: owned } = await getOwnedAnnouncement(id, caller.sub, caller.schoolId);
  if (!owned)
    return NextResponse.json({ message: 'ไม่พบประกาศหรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  const announcementType = typeof body?.announcementType === 'string' ? body.announcementType : '';
  const priority = typeof body?.priority === 'string' ? body.priority : '';
  const classroomIds: string[] = Array.isArray(body?.classroomIds)
    ? Array.from(
        new Set(
          body.classroomIds.filter((value: unknown): value is string => typeof value === 'string')
        )
      )
    : [];
  const eventStart =
    typeof body?.eventStart === 'string' && body.eventStart ? body.eventStart : null;
  const eventEnd = typeof body?.eventEnd === 'string' && body.eventEnd ? body.eventEnd : null;
  const expiresAt = typeof body?.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null;

  if (!title || !content || !classroomIds.length) {
    return NextResponse.json(
      { message: 'กรุณากรอกข้อมูลและเลือกห้องเรียนอย่างน้อย 1 ห้อง' },
      { status: 400 }
    );
  }
  if (!TYPES.includes(announcementType) || !PRIORITIES.includes(priority)) {
    return NextResponse.json({ message: 'ประเภทหรือระดับความสำคัญไม่ถูกต้อง' }, { status: 400 });
  }
  if (eventStart && eventEnd && eventEnd < eventStart) {
    return NextResponse.json({ message: 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น' }, { status: 400 });
  }

  try {
    const allowedIds = await getAllowedClassroomIds(caller.sub, caller.schoolId);
    if (classroomIds.some((classroomId) => !allowedIds.has(classroomId))) {
      return NextResponse.json(
        { message: 'เลือกได้เฉพาะห้องเรียนที่คุณรับผิดชอบ' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('school_announcements')
      .update({
        title,
        content,
        priority,
        announcement_type: announcementType,
        event_start: eventStart,
        event_end: eventEnd,
        expires_at: expiresAt,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    const { data: currentTargets, error: currentTargetsError } = await supabaseAdmin
      .from('announcement_classrooms')
      .select('classroom_id')
      .eq('announcement_id', id);
    if (currentTargetsError) throw new Error(currentTargetsError.message);

    const currentIds = new Set(currentTargets.map((target) => target.classroom_id));
    const additions = classroomIds.filter((classroomId) => !currentIds.has(classroomId));
    const removals = currentTargets
      .map((target) => target.classroom_id)
      .filter((classroomId) => !classroomIds.includes(classroomId));

    if (additions.length) {
      const { error: targetError } = await supabaseAdmin
        .from('announcement_classrooms')
        .insert(
          additions.map((classroomId) => ({ announcement_id: id, classroom_id: classroomId }))
        );
      if (targetError) throw new Error(targetError.message);
    }

    if (removals.length) {
      const { error: removeError } = await supabaseAdmin
        .from('announcement_classrooms')
        .delete()
        .eq('announcement_id', id)
        .in('classroom_id', removals);
      if (removeError) throw new Error(removeError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'ไม่สามารถแก้ไขประกาศได้' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: owned } = await getOwnedAnnouncement(id, caller.sub, caller.schoolId);
  if (!owned)
    return NextResponse.json({ message: 'ไม่พบประกาศหรือไม่มีสิทธิ์ลบ' }, { status: 404 });

  const { error } = await supabaseAdmin.from('school_announcements').delete().eq('id', id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
