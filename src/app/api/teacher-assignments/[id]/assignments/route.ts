import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { loadTeacherAssignment, canAccessTeacherAssignment } from 'src/lib/teacher-assignment-access';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);

  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('assignments')
    .select('id, title, description, full_score, created_at')
    .eq('teacher_assignment_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: data });
}

export async function POST(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const teacherAssignment = await loadTeacherAssignment(id);

  if (!canAccessTeacherAssignment(caller, teacherAssignment)) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { title, description, fullScore } = await request.json();

  if (!title) {
    return NextResponse.json({ message: 'กรุณากรอกชื่องาน' }, { status: 400 });
  }

  const parsedFullScore = fullScore !== undefined ? Number(fullScore) : 100;

  if (Number.isNaN(parsedFullScore) || parsedFullScore <= 0) {
    return NextResponse.json({ message: 'คะแนนเต็มต้องมากกว่า 0' }, { status: 400 });
  }

  const { data: assignment, error } = await supabaseAdmin
    .from('assignments')
    .insert({
      teacher_assignment_id: id,
      title,
      description: description || null,
      full_score: parsedFullScore,
    })
    .select('id, title, description, full_score, created_at')
    .single();

  if (error || !assignment) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถสร้างงานได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({ assignment }, { status: 201 });
}
