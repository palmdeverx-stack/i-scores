import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  loadTeacherAssignment,
  canAccessTeacherAssignment,
} from 'src/lib/teacher-assignment-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin', 'teacher', 'student']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดาวน์โหลดไฟล์' }, { status: 403 });
  }

  const { id } = await params;
  const { data: attachment } = await supabaseAdmin
    .from('assignment_attachments')
    .select('assignment_id, storage_path, file_name')
    .eq('id', id)
    .maybeSingle();
  if (!attachment) {
    return NextResponse.json({ message: 'ไม่พบไฟล์' }, { status: 404 });
  }

  const { data: assignment } = await supabaseAdmin
    .from('assignments')
    .select('teacher_assignment_id')
    .eq('id', attachment.assignment_id)
    .maybeSingle();
  if (!assignment) {
    return NextResponse.json({ message: 'ไม่พบงานที่เชื่อมกับไฟล์' }, { status: 404 });
  }

  const teacherAssignment = await loadTeacherAssignment(assignment.teacher_assignment_id);
  let allowed = canAccessTeacherAssignment(caller, teacherAssignment);
  if (caller.role === 'student' && teacherAssignment) {
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('student_id', caller.sub)
      .eq('classroom_id', teacherAssignment.classroom_id)
      .maybeSingle();
    allowed = Boolean(enrollment);
  }
  if (!allowed) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์ดาวน์โหลดไฟล์' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('assignment-attachments')
    .createSignedUrl(attachment.storage_path, 60, { download: attachment.file_name });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ message: 'ไม่สามารถสร้างลิงก์ดาวน์โหลดได้' }, { status: 500 });
  }

  const response = NextResponse.redirect(data.signedUrl, 307);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
