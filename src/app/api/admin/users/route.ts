import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { generatePassword } from 'src/lib/generate-password';
import { decryptCredential, encryptCredential } from 'src/lib/credential-cipher';

// ----------------------------------------------------------------------

const SCHOOL_ADMIN_CREATABLE_ROLES = ['teacher', 'student'] as const;

export async function GET(request: Request) {
  const caller = requireRole(request, ['master_admin', 'school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  // Teachers may only look up students (e.g. to enroll them into a classroom) —
  // they can't browse the staff directory.
  if (caller.role === 'teacher' && role !== 'student') {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  let query = supabaseAdmin
    .from('app_users')
    .select(
      'id, username, email, first_name, last_name, avatar_url, role, school_id, school:schools!app_users_school_id_fkey(name), created_at, must_change_password, password_ciphertext'
    )
    .order('created_at', { ascending: false });

  if (caller.role === 'master_admin') {
    query = query.eq('role', role ?? 'school_admin');
  } else {
    query = query.eq('school_id', caller.schoolId);
    if (role) query = query.eq('role', role);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const users = data.map(({ password_ciphertext: passwordCiphertext, ...user }) => ({
    ...user,
    ...(caller.role === 'school_admin' &&
      (user.role === 'student' || user.role === 'teacher') && {
        login_password: decryptCredential(passwordCiphertext ?? null),
      }),
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin', 'school_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json();
  const { username, email, password: providedPassword, firstName, lastName, role, schoolId } = body;

  if (!username || !firstName || !lastName || !role) {
    return NextResponse.json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  }

  // Teacher/student passwords are auto-generated: the account holder must
  // change it on first login anyway, so there's no need for the admin to type one.
  const isAutoGenRole = role === 'teacher' || role === 'student';

  if (!isAutoGenRole && !providedPassword) {
    return NextResponse.json({ message: 'กรุณากรอกรหัสผ่าน' }, { status: 400 });
  }

  let targetSchoolId: string;

  if (caller.role === 'master_admin') {
    if (role !== 'school_admin' || !schoolId) {
      return NextResponse.json(
        { message: 'ผู้ดูแลระบบสร้างได้เฉพาะบัญชีผู้ดูแลโรงเรียน และต้องระบุโรงเรียนด้วย' },
        { status: 400 }
      );
    }
    targetSchoolId = schoolId;
  } else {
    if (!SCHOOL_ADMIN_CREATABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { message: 'ผู้ดูแลโรงเรียนสร้างได้เฉพาะบัญชีครูหรือนักเรียน' },
        { status: 400 }
      );
    }
    targetSchoolId = caller.schoolId!;
  }

  const { data: existing } = await supabaseAdmin
    .from('app_users')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: 'ชื่อผู้ใช้งานนี้ถูกใช้แล้ว' }, { status: 409 });
  }

  const password = providedPassword || generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .insert({
      username,
      password_hash: passwordHash,
      password_ciphertext: isAutoGenRole ? encryptCredential(password) : null,
      must_change_password: isAutoGenRole,
      email: email || null,
      first_name: firstName,
      last_name: lastName,
      role,
      school_id: targetSchoolId,
    })
    .select(
      'id, username, email, first_name, last_name, role, school_id, created_at, must_change_password'
    )
    .single();

  if (error || !user) {
    return NextResponse.json(
      { message: error?.message ?? 'Failed to create user' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { user, generatedPassword: isAutoGenRole ? password : undefined },
    { status: 201 }
  );
}
