import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

const TYPES = ['general', 'holiday', 'exam'];
const PRIORITIES = ['normal', 'important', 'urgent'];

async function getTeacherClassrooms(teacherId: string, schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from('teacher_assignments')
    .select('classroom:classrooms!inner(id, name, grade_level, school_id)')
    .eq('teacher_id', teacherId)
    .eq('classrooms.school_id', schoolId);

  if (error) throw new Error(error.message);

  const classrooms = data.map(
    (row) => row.classroom as unknown as { id: string; name: string; grade_level: string | null }
  );
  return Array.from(new Map(classrooms.map((item) => [item.id, item])).values());
}

function parseBody(body: Record<string, unknown> | null) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  const announcementType = typeof body?.announcementType === 'string' ? body.announcementType : '';
  const priority = typeof body?.priority === 'string' ? body.priority : '';
  const classroomIds = Array.isArray(body?.classroomIds)
    ? Array.from(new Set(body.classroomIds.filter((id): id is string => typeof id === 'string')))
    : [];
  const eventStart =
    typeof body?.eventStart === 'string' && body.eventStart ? body.eventStart : null;
  const eventEnd = typeof body?.eventEnd === 'string' && body.eventEnd ? body.eventEnd : null;
  const expiresAt = typeof body?.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null;

  return {
    title,
    content,
    announcementType,
    priority,
    classroomIds,
    eventStart,
    eventEnd,
    expiresAt,
  };
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const [{ data, error }, classrooms] = await Promise.all([
      supabaseAdmin
        .from('school_announcements')
        .select(
          `id, title, content, priority, announcement_type, is_published, published_at,
           expires_at, event_start, event_end, created_at,
           targets:announcement_classrooms(classroom_id, classroom:classrooms(id, name, grade_level))`
        )
        .eq('school_id', caller.schoolId)
        .eq('created_by', caller.sub)
        .order('created_at', { ascending: false }),
      getTeacherClassrooms(caller.sub, caller.schoolId),
    ]);

    if (error) throw new Error(error.message);
    return NextResponse.json({ announcements: data, classrooms });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'ไม่สามารถโหลดประกาศได้' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const values = parseBody(await request.json().catch(() => null));
  if (!values.title || !values.content || !values.classroomIds.length) {
    return NextResponse.json(
      { message: 'กรุณากรอกหัวข้อ เนื้อหา และเลือกห้องเรียนอย่างน้อย 1 ห้อง' },
      { status: 400 }
    );
  }
  if (!TYPES.includes(values.announcementType) || !PRIORITIES.includes(values.priority)) {
    return NextResponse.json({ message: 'ประเภทหรือระดับความสำคัญไม่ถูกต้อง' }, { status: 400 });
  }
  if (values.eventStart && values.eventEnd && values.eventEnd < values.eventStart) {
    return NextResponse.json({ message: 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น' }, { status: 400 });
  }

  try {
    const classrooms = await getTeacherClassrooms(caller.sub, caller.schoolId);
    const allowedIds = new Set(classrooms.map((item) => item.id));
    if (values.classroomIds.some((id) => !allowedIds.has(id))) {
      return NextResponse.json(
        { message: 'เลือกได้เฉพาะห้องเรียนที่คุณรับผิดชอบ' },
        { status: 403 }
      );
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('school_announcements')
      .insert({
        school_id: caller.schoolId,
        created_by: caller.sub,
        title: values.title,
        content: values.content,
        priority: values.priority,
        announcement_type: values.announcementType,
        event_start: values.eventStart,
        event_end: values.eventEnd,
        expires_at: values.expiresAt,
        is_published: true,
      })
      .select('id')
      .single();

    if (error || !announcement) throw new Error(error?.message ?? 'ไม่สามารถสร้างประกาศได้');

    const { error: targetError } = await supabaseAdmin.from('announcement_classrooms').insert(
      values.classroomIds.map((classroomId) => ({
        announcement_id: announcement.id,
        classroom_id: classroomId,
      }))
    );
    if (targetError) {
      await supabaseAdmin.from('school_announcements').delete().eq('id', announcement.id);
      throw new Error(targetError.message);
    }

    return NextResponse.json({ id: announcement.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'ไม่สามารถสร้างประกาศได้' },
      { status: 500 }
    );
  }
}
