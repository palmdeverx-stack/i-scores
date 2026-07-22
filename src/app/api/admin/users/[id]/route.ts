import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

async function getSchoolAdmin(id: string) {
  return supabaseAdmin
    .from('app_users')
    .select(
      'id, username, email, first_name, last_name, avatar_url, role, school_id, school:schools!app_users_school_id_fkey(name), created_at, must_change_password'
    )
    .eq('id', id)
    .eq('role', 'school_admin')
    .maybeSingle();
}

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: user, error } = await getSchoolAdmin(id);
  if (error || !user) {
    return NextResponse.json({ message: 'ไม่พบบัญชีผู้ดูแลโรงเรียน' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: target } = await getSchoolAdmin(id);
  if (!target) {
    return NextResponse.json({ message: 'ไม่พบบัญชีผู้ดูแลโรงเรียน' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const schoolId = typeof body?.schoolId === 'string' ? body.schoolId : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!username || !firstName || !lastName || !schoolId) {
    return NextResponse.json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  }
  if (password && password.length < 6) {
    return NextResponse.json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
  }

  const [{ data: duplicate }, { data: school }] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('id')
      .ilike('username', username)
      .neq('id', id)
      .maybeSingle(),
    supabaseAdmin.from('schools').select('id').eq('id', schoolId).maybeSingle(),
  ]);

  if (duplicate) {
    return NextResponse.json({ message: 'ชื่อผู้ใช้งานนี้ถูกใช้แล้ว' }, { status: 409 });
  }
  if (!school) {
    return NextResponse.json({ message: 'ไม่พบโรงเรียนที่เลือก' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    username,
    first_name: firstName,
    last_name: lastName,
    email: email || null,
    school_id: schoolId,
  };
  if (password) {
    updates.password_hash = await bcrypt.hash(password, 10);
    updates.must_change_password = true;
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .update(updates)
    .eq('id', id)
    .eq('role', 'school_admin')
    .select(
      'id, username, email, first_name, last_name, avatar_url, role, school_id, school:schools!app_users_school_id_fkey(name), created_at, must_change_password'
    )
    .single();

  if (error || !user) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถแก้ไขบัญชีผู้ดูแลได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: target } = await getSchoolAdmin(id);
  if (!target) {
    return NextResponse.json({ message: 'ไม่พบบัญชีผู้ดูแลโรงเรียน' }, { status: 404 });
  }

  const { count: gradedScoreCount } = await supabaseAdmin
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('graded_by', id);

  if (gradedScoreCount) {
    return NextResponse.json(
      {
        message: 'บัญชีนี้มีประวัติการบันทึกคะแนนอยู่ จึงไม่สามารถลบได้ กรุณาเปลี่ยนข้อมูลบัญชีแทน',
      },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from('app_users')
    .delete()
    .eq('id', id)
    .eq('role', 'school_admin');

  if (error) {
    return NextResponse.json(
      { message: 'ไม่สามารถลบบัญชีได้ เนื่องจากมีข้อมูลที่เชื่อมโยงอยู่' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
