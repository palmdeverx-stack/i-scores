import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { schoolHasFeature } from 'src/lib/school-subscription';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ guardianId: string }> };

async function authorize(request: Request, guardianId: string) {
  const caller = requireRole(request, ['school_admin', 'teacher']);
  if (!caller?.schoolId) return null;
  if (!(await schoolHasFeature(caller.schoolId, 'admin.line_notifications'))) return null;
  const { data: guardian } = await supabaseAdmin
    .from('student_guardians')
    .select('id, full_name, student_id')
    .eq('id', guardianId)
    .eq('school_id', caller.schoolId)
    .maybeSingle();
  if (!guardian) return null;
  if (caller.role === 'teacher') {
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('classroom_id')
      .eq('student_id', guardian.student_id);
    const classroomIds = Array.from(
      new Set((enrollments ?? []).map((enrollment) => enrollment.classroom_id))
    );
    if (!classroomIds.length) return null;
    const [{ data: homeroom }, { data: assignment }] = await Promise.all([
      supabaseAdmin
        .from('classroom_homeroom_teachers')
        .select('classroom_id')
        .eq('teacher_id', caller.sub)
        .in('classroom_id', classroomIds)
        .limit(1),
      supabaseAdmin
        .from('teacher_assignments')
        .select('classroom_id')
        .eq('teacher_id', caller.sub)
        .in('classroom_id', classroomIds)
        .limit(1),
    ]);
    if (!homeroom?.length && !assignment?.length) return null;
  }
  return { caller, guardian };
}

export async function POST(request: Request, { params }: RouteParams) {
  const { guardianId } = await params;
  const access = await authorize(request, guardianId);
  if (!access?.caller.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เชื่อม LINE ผู้ปกครอง' }, { status: 403 });
  }
  const { data: integration } = await supabaseAdmin
    .from('school_line_integrations')
    .select('is_enabled, oa_basic_id')
    .eq('school_id', access.caller.schoolId)
    .maybeSingle();
  if (!integration?.is_enabled) {
    return NextResponse.json(
      { message: 'ผู้ดูแลโรงเรียนยังไม่ได้เปิดการแจ้งเตือน LINE' },
      { status: 409 }
    );
  }

  const code = randomBytes(4).toString('hex').toUpperCase();
  const tokenHash = createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  const { error } = await supabaseAdmin.from('guardian_line_link_tokens').upsert(
    {
      school_id: access.caller.schoolId,
      guardian_id: guardianId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: access.caller.sub,
      used_at: null,
    },
    { onConflict: 'guardian_id' }
  );
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({
    code,
    expiresAt,
    message: `LINK ${code}`,
    addFriendUrl: integration.oa_basic_id
      ? `https://line.me/R/ti/p/${encodeURIComponent(integration.oa_basic_id)}`
      : null,
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { guardianId } = await params;
  const access = await authorize(request, guardianId);
  if (!access?.caller.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ยกเลิกการเชื่อม LINE' }, { status: 403 });
  }
  const { error } = await supabaseAdmin
    .from('student_guardians')
    .update({
      line_user_id: null,
      line_display_name: null,
      line_linked_at: null,
    })
    .eq('id', guardianId)
    .eq('school_id', access.caller.schoolId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  await supabaseAdmin.from('guardian_line_link_tokens').delete().eq('guardian_id', guardianId);
  return NextResponse.json({ success: true });
}
