import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

async function loadTeacherProfile(teacherId: string, schoolId: string | null) {
  const [teacherResult, schoolResult, assignmentsResult] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select(
        'id, username, email, first_name, last_name, first_name_en, last_name_en, avatar_url, created_at'
      )
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .maybeSingle(),
    schoolId
      ? supabaseAdmin
          .from('schools')
          .select('id, name, code, logo_url')
          .eq('id', schoolId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from('teacher_assignments')
      .select(
        `id, created_at,
         subject:subjects(id, code, name),
         classroom:classrooms(id, name),
         semester:semesters(id, name, is_active),
         schedules:teaching_schedules(day_of_week, start_time, end_time)`
      )
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false }),
  ]);

  if (teacherResult.error || schoolResult.error || assignmentsResult.error) {
    throw new Error(
      teacherResult.error?.message ??
        schoolResult.error?.message ??
        assignmentsResult.error?.message
    );
  }

  if (!teacherResult.data) return null;

  const assignments = assignmentsResult.data;

  return {
    ...teacherResult.data,
    school: schoolResult.data,
    summary: {
      assignments: assignments.length,
      subjects: new Set(
        assignments
          .map((item) => (item.subject as unknown as { id: string } | null)?.id)
          .filter(Boolean)
      ).size,
      classrooms: new Set(
        assignments
          .map((item) => (item.classroom as unknown as { id: string } | null)?.id)
          .filter(Boolean)
      ).size,
    },
    teaching_assignments: assignments.slice(0, 6),
  };
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const profile = await loadTeacherProfile(caller.sub, caller.schoolId);

    if (!profile) {
      return NextResponse.json({ message: 'ไม่พบข้อมูลครูผู้สอน' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const caller = requireRole(request, ['teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const firstNameEn = typeof body?.firstNameEn === 'string' ? body.firstNameEn.trim() : '';
  const lastNameEn = typeof body?.lastNameEn === 'string' ? body.lastNameEn.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!firstName || !lastName) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อและนามสกุล' }, { status: 400 });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('app_users')
    .update({
      first_name: firstName,
      last_name: lastName,
      first_name_en: firstNameEn || null,
      last_name_en: lastNameEn || null,
      email: email || null,
    })
    .eq('id', caller.sub)
    .eq('role', 'teacher');

  if (updateError) {
    const message = updateError.code === '23505' ? 'อีเมลนี้ถูกใช้งานแล้ว' : updateError.message;
    return NextResponse.json({ message }, { status: 400 });
  }

  try {
    const profile = await loadTeacherProfile(caller.sub, caller.schoolId);
    return NextResponse.json({ profile });
  } catch (loadError) {
    return NextResponse.json(
      {
        message:
          loadError instanceof Error
            ? loadError.message
            : 'บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ',
      },
      { status: 500 }
    );
  }
}
