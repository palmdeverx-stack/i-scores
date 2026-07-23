import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { encryptCredential } from 'src/lib/credential-cipher';
import { checkSchoolSeatLimit } from 'src/lib/school-subscription';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

const USER_SELECT =
  'id, username, email, first_name, last_name, avatar_url, role, school_id, school:schools!app_users_school_id_fkey(name), created_at, must_change_password, student_status, is_active';

async function getManagedUser(id: string) {
  return supabaseAdmin.from('app_users').select(USER_SELECT).eq('id', id).maybeSingle();
}

function canManage(
  caller: { role: string; schoolId: string | null },
  target: { role: string; school_id: string | null }
) {
  if (caller.role === 'master_admin') return target.role === 'school_admin';
  return (
    caller.role === 'school_admin' &&
    caller.schoolId === target.school_id &&
    (target.role === 'teacher' || target.role === 'student')
  );
}

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { data: user, error } = await getManagedUser(id);
  if (error || !user || !canManage(caller, user)) {
    return NextResponse.json({ message: 'ไม่พบบัญชีหรือไม่มีสิทธิ์จัดการ' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { data: target } = await getManagedUser(id);
  if (!target || !canManage(caller, target)) {
    return NextResponse.json({ message: 'ไม่พบบัญชีหรือไม่มีสิทธิ์จัดการ' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (body?.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ message: 'สถานะบัญชีไม่ถูกต้อง' }, { status: 400 });
    }
    if (
      body.isActive &&
      target.role === 'student' &&
      (target.student_status ?? 'studying') !== 'studying'
    ) {
      return NextResponse.json(
        { message: 'ต้องเปลี่ยนสถานะนักเรียนเป็น “กำลังศึกษา” ก่อนเปิดใช้งานบัญชี' },
        { status: 409 }
      );
    }
    if (body.isActive && !target.is_active && target.school_id) {
      const seat = await checkSchoolSeatLimit(
        target.school_id,
        target.role as 'school_admin' | 'teacher' | 'student'
      );
      if (!seat.allowed) {
        return NextResponse.json({ message: seat.message }, { status: 409 });
      }
    }

    const { data: user, error } = await supabaseAdmin
      .from('app_users')
      .update({ is_active: body.isActive })
      .eq('id', id)
      .select(USER_SELECT)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { message: error?.message ?? 'ไม่สามารถเปลี่ยนสถานะบัญชีได้' },
        { status: 500 }
      );
    }
    return NextResponse.json({ user });
  }

  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const schoolId =
    caller.role === 'master_admin' && typeof body?.schoolId === 'string'
      ? body.schoolId
      : target.school_id;

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
  if (schoolId !== target.school_id) {
    const seat = await checkSchoolSeatLimit(
      schoolId,
      target.role as 'school_admin' | 'teacher' | 'student'
    );
    if (!seat.allowed) {
      return NextResponse.json({ message: seat.message }, { status: 409 });
    }
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
    updates.password_ciphertext =
      target.role === 'teacher' || target.role === 'student' ? encryptCredential(password) : null;
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .update(updates)
    .eq('id', id)
    .select(USER_SELECT)
    .single();

  if (error || !user) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถแก้ไขบัญชีได้' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin', 'school_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { data: target } = await getManagedUser(id);
  if (!target || !canManage(caller, target)) {
    return NextResponse.json({ message: 'ไม่พบบัญชีหรือไม่มีสิทธิ์จัดการ' }, { status: 404 });
  }

  const { count: gradedScoreCount } = await supabaseAdmin
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .eq('graded_by', id);

  if (gradedScoreCount) {
    return NextResponse.json(
      {
        message: 'บัญชีนี้มีประวัติการบันทึกคะแนน จึงไม่สามารถลบได้ กรุณาปิดใช้งานแทน',
      },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin.from('app_users').delete().eq('id', id);
  if (error) {
    return NextResponse.json(
      { message: 'ไม่สามารถลบบัญชีได้ เนื่องจากมีข้อมูลที่เชื่อมโยงอยู่ กรุณาปิดใช้งานแทน' },
      { status: 409 }
    );
  }

  const { data: avatarFiles } = await supabaseAdmin.storage.from('profile-avatars').list(id);
  if (avatarFiles?.length) {
    await supabaseAdmin.storage
      .from('profile-avatars')
      .remove(avatarFiles.map((file) => `${id}/${file.name}`));
  }

  return NextResponse.json({ success: true });
}
