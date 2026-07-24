import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { generatePassword } from 'src/lib/generate-password';
import { decryptCredential, encryptCredential } from 'src/lib/credential-cipher';
import { schoolHasFeature, checkSchoolSeatLimit } from 'src/lib/school-subscription';

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
      'id, username, email, first_name, last_name, avatar_url, role, school_id, school:schools!app_users_school_id_fkey(name), created_at, must_change_password, student_status, student_code, national_id, name_prefix, first_name_en, last_name_en, nickname, gender, birth_date, nationality, ethnicity, religion, is_active, password_ciphertext'
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

  const studentIds = data.filter((user) => user.role === 'student').map((user) => user.id);
  const guardianSummary = new Map<
    string,
    { guardianCount: number; linkedCount: number; notificationsEnabledCount: number }
  >();

  if (studentIds.length) {
    const guardiansQuery = supabaseAdmin
      .from('student_guardians')
      .select('student_id, line_user_id, line_notifications_enabled');
    const { data: guardians, error: guardiansError } = caller.schoolId
      ? await guardiansQuery.eq('school_id', caller.schoolId)
      : await guardiansQuery.in('student_id', studentIds);

    if (guardiansError) {
      return NextResponse.json({ message: guardiansError.message }, { status: 500 });
    }

    for (const guardian of guardians ?? []) {
      const summary = guardianSummary.get(guardian.student_id) ?? {
        guardianCount: 0,
        linkedCount: 0,
        notificationsEnabledCount: 0,
      };
      summary.guardianCount += 1;
      if (guardian.line_user_id) {
        summary.linkedCount += 1;
        if (guardian.line_notifications_enabled) summary.notificationsEnabledCount += 1;
      }
      guardianSummary.set(guardian.student_id, summary);
    }
  }

  const users = data.map(({ password_ciphertext: passwordCiphertext, ...user }) => ({
    ...user,
    ...(user.role === 'student' && {
      guardian_count: guardianSummary.get(user.id)?.guardianCount ?? 0,
      line_guardian_count: guardianSummary.get(user.id)?.linkedCount ?? 0,
      line_notifications_enabled_count:
        guardianSummary.get(user.id)?.notificationsEnabledCount ?? 0,
    }),
    ...(caller.role === 'school_admin' &&
      (user.role === 'student' || user.role === 'teacher') && {
        login_password: decryptCredential(passwordCiphertext ?? null),
      }),
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin', 'school_admin', 'teacher']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json();
  const {
    username,
    email,
    password: providedPassword,
    firstName,
    lastName,
    role,
    schoolId,
    studentCode,
    nationalId,
    namePrefix,
    firstNameEn,
    lastNameEn,
    nickname,
    gender,
    birthDate,
    nationality,
    ethnicity,
    religion,
  } = body;

  if (!username || !firstName || !lastName || !role) {
    return NextResponse.json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  }

  if (role === 'student' && !studentCode?.trim()) {
    return NextResponse.json({ message: 'กรุณากรอกรหัสนักเรียน' }, { status: 400 });
  }
  if (role === 'student' && nationalId?.trim() && !/^\d{13}$/.test(nationalId.trim())) {
    return NextResponse.json(
      { message: 'เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก' },
      { status: 400 }
    );
  }
  if (
    role === 'student' &&
    gender &&
    !['male', 'female', 'other', 'unspecified'].includes(gender)
  ) {
    return NextResponse.json({ message: 'ข้อมูลเพศไม่ถูกต้อง' }, { status: 400 });
  }
  if (role === 'student' && birthDate && Number.isNaN(Date.parse(birthDate))) {
    return NextResponse.json({ message: 'วันเดือนปีเกิดไม่ถูกต้อง' }, { status: 400 });
  }
  if (role === 'student' && birthDate && new Date(birthDate).getTime() > Date.now()) {
    return NextResponse.json(
      { message: 'วันเดือนปีเกิดต้องไม่เป็นวันที่ในอนาคต' },
      { status: 400 }
    );
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
  } else if (caller.role === 'school_admin') {
    if (!SCHOOL_ADMIN_CREATABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { message: 'ผู้ดูแลโรงเรียนสร้างได้เฉพาะบัญชีครูหรือนักเรียน' },
        { status: 400 }
      );
    }
    targetSchoolId = caller.schoolId!;
  } else {
    if (role !== 'student' || !caller.schoolId) {
      return NextResponse.json(
        { message: 'ครูสร้างได้เฉพาะบัญชีนักเรียนในโรงเรียนของตนเอง' },
        { status: 403 }
      );
    }
    targetSchoolId = caller.schoolId;
  }

  const requiredFeature =
    caller.role === 'teacher'
      ? 'teacher.manage_enrollments'
      : role === 'teacher'
        ? 'admin.staff'
        : role === 'student'
          ? 'admin.students'
          : null;
  if (
    (caller.role === 'school_admin' || caller.role === 'teacher') &&
    requiredFeature &&
    !(await schoolHasFeature(targetSchoolId, requiredFeature))
  ) {
    return NextResponse.json(
      { message: 'แพ็กเกจโรงเรียนไม่รองรับการสร้างบัญชีประเภทนี้' },
      { status: 403 }
    );
  }

  const seat = await checkSchoolSeatLimit(
    targetSchoolId,
    role as 'school_admin' | 'teacher' | 'student'
  );
  if (!seat.allowed) {
    return NextResponse.json({ message: seat.message }, { status: 409 });
  }

  const { data: existing } = await supabaseAdmin
    .from('app_users')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: 'ชื่อผู้ใช้งานนี้ถูกใช้แล้ว' }, { status: 409 });
  }

  if (role === 'student') {
    const [{ data: duplicateStudentCode }, { data: duplicateNationalId }] = await Promise.all([
      supabaseAdmin
        .from('app_users')
        .select('id')
        .eq('school_id', targetSchoolId)
        .ilike('student_code', studentCode.trim())
        .maybeSingle(),
      nationalId?.trim()
        ? supabaseAdmin
            .from('app_users')
            .select('id')
            .eq('national_id', nationalId.trim())
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (duplicateStudentCode) {
      return NextResponse.json({ message: 'รหัสนักเรียนนี้ถูกใช้แล้ว' }, { status: 409 });
    }
    if (duplicateNationalId) {
      return NextResponse.json({ message: 'เลขประจำตัวประชาชนนี้ถูกใช้แล้ว' }, { status: 409 });
    }
  }

  const password = providedPassword || generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const supportsBilingualName = role === 'teacher' || role === 'student';

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .insert({
      username,
      password_hash: passwordHash,
      password_ciphertext: isAutoGenRole ? encryptCredential(password) : null,
      must_change_password: true,
      email: email || null,
      first_name: firstName,
      last_name: lastName,
      role,
      school_id: targetSchoolId,
      student_status: role === 'student' ? 'studying' : null,
      student_code: role === 'student' ? studentCode.trim() : null,
      national_id: role === 'student' ? nationalId?.trim() || null : null,
      name_prefix: role === 'student' ? namePrefix?.trim() || null : null,
      first_name_en: supportsBilingualName ? firstNameEn?.trim() || null : null,
      last_name_en: supportsBilingualName ? lastNameEn?.trim() || null : null,
      nickname: role === 'student' ? nickname?.trim() || null : null,
      gender: role === 'student' ? gender || null : null,
      birth_date: role === 'student' ? birthDate || null : null,
      nationality: role === 'student' ? nationality?.trim() || null : null,
      ethnicity: role === 'student' ? ethnicity?.trim() || null : null,
      religion: role === 'student' ? religion?.trim() || null : null,
      is_active: true,
    })
    .select(
      'id, username, email, first_name, last_name, avatar_url, role, school_id, created_at, must_change_password, student_status, student_code, national_id, name_prefix, first_name_en, last_name_en, nickname, gender, birth_date, nationality, ethnicity, religion, is_active'
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
