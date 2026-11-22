import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { RESEND_GMAIL_SENDER_ERROR } from 'src/lib/resend';
import { generatePassword } from 'src/lib/generate-password';
import { encryptCredential } from 'src/lib/credential-cipher';
import { sendSchoolInviteEmail } from 'src/lib/school-invite-email';
import { seedDefaultDepartments } from 'src/lib/default-departments';
import { linkStaffToSupabaseAuth } from 'src/lib/staff-supabase-auth';

import {
  SCHOOL_ADMIN_USERNAME_ERROR,
  SCHOOL_ADMIN_USERNAME_PATTERN,
} from 'src/sections/school/school-admin-username';

// ----------------------------------------------------------------------

async function countFor(table: string, schoolId: string, extraFilter?: Record<string, string>) {
  let query = supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId);

  if (extraFilter) {
    for (const [key, value] of Object.entries(extraFilter)) {
      query = query.eq(key, value);
    }
  }

  const { count } = await query;
  return count ?? 0;
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['master_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data: schools, error } = await supabaseAdmin
    .from('schools')
    .select(
      `id, name, name_en, code, logo_url, is_active, created_at, owner_auth_user_id, workspace_type,
       admins:app_users!app_users_school_id_fkey(first_name, last_name, username),
       licenses:marketplace_school_licenses(expires_at),
       subscription:school_subscriptions(plan_name, status, ends_at)`
    )
    .eq('admins.role', 'school_admin')
    .eq('admins.is_active', true)
    .order('username', { referencedTable: 'admins' })
    .in('licenses.status', ['active', 'expired'])
    .order('expires_at', { referencedTable: 'licenses', ascending: false })
    .limit(1, { referencedTable: 'licenses' })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const ownerIds = [
    ...new Set(
      schools.flatMap(({ owner_auth_user_id }) => (owner_auth_user_id ? [owner_auth_user_id] : []))
    ),
  ];
  const { data: owners, error: ownerError } = ownerIds.length
    ? await supabaseAdmin
        .from('app_users')
        .select('auth_user_id, school_id, first_name, last_name, username')
        .in('auth_user_id', ownerIds)
    : { data: [], error: null };
  if (ownerError) {
    return NextResponse.json({ message: ownerError.message }, { status: 500 });
  }
  const ownersByWorkspace = new Map(
    owners.map((owner) => [`${owner.school_id}:${owner.auth_user_id}`, owner])
  );
  const displayName = ({
    first_name,
    last_name,
    username,
  }: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  }) => [first_name?.trim(), last_name?.trim()].filter(Boolean).join(' ') || username;

  const withCounts = await Promise.all(
    schools.map(async ({ owner_auth_user_id, admins, licenses, workspace_type, ...school }) => {
      const owner = ownersByWorkspace.get(`${school.id}:${owner_auth_user_id}`);
      const subscription = Array.isArray(school.subscription)
        ? (school.subscription[0] ?? null)
        : school.subscription;
      const schoolSubscription = workspace_type === 'personal' ? null : subscription;
      const noExpiration =
        !schoolSubscription?.ends_at &&
        (schoolSubscription?.status === 'active' || schoolSubscription?.status === 'trialing');
      const licenseExpiry = licenses?.[0]?.expires_at ?? null;
      const subscriptionExpiry = schoolSubscription?.ends_at ?? null;
      const expiresAt =
        subscriptionExpiry &&
        (!licenseExpiry ||
          Date.parse(`${subscriptionExpiry}T23:59:59.999Z`) >= Date.parse(licenseExpiry))
          ? subscriptionExpiry
          : licenseExpiry;
      return {
        ...school,
        subscription,
        expiresAt: noExpiration ? null : expiresAt,
        noExpiration,
        ownerName: owner ? displayName(owner) : null,
        administratorNames: (admins ?? []).map(displayName),
        teacherCount: await countFor('app_users', school.id, { role: 'teacher' }),
        studentCount: await countFor('app_users', school.id, { role: 'student' }),
        classroomCount: await countFor('classrooms', school.id),
        subjectCount: await countFor('subjects', school.id),
      };
    })
  );

  return NextResponse.json({ schools: withCounts });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin']);

  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { name, nameEn, code, email, adminUsername: requestedUsername } = await request.json();

  if (!name || !code || !email) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อ รหัสโรงเรียน และอีเมล' }, { status: 400 });
  }

  const normalizedCode = String(code).trim();
  if (!/^\d{8}$/.test(normalizedCode)) {
    return NextResponse.json({ message: 'รหัสโรงเรียนต้องเป็นตัวเลข 8 หลัก' }, { status: 400 });
  }

  const normalizedEmail = String(email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ message: 'อีเมลไม่ถูกต้อง' }, { status: 400 });
  }

  if (requestedUsername !== undefined && typeof requestedUsername !== 'string') {
    return NextResponse.json({ message: SCHOOL_ADMIN_USERNAME_ERROR }, { status: 400 });
  }
  const adminUsername = requestedUsername?.trim() || `admin.${normalizedCode}`;
  if (!SCHOOL_ADMIN_USERNAME_PATTERN.test(adminUsername)) {
    return NextResponse.json({ message: SCHOOL_ADMIN_USERNAME_ERROR }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('schools')
    .select('id')
    .ilike('code', normalizedCode)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: 'รหัสโรงเรียนนี้ถูกใช้แล้ว' }, { status: 409 });
  }

  const { data: existingAdmin, error: usernameLookupError } = await supabaseAdmin
    .from('app_users')
    .select('id')
    .ilike('username', adminUsername.replaceAll('_', '\\_'))
    .maybeSingle();
  if (usernameLookupError) {
    return NextResponse.json({ message: 'ตรวจสอบชื่อผู้ใช้งานไม่สำเร็จ' }, { status: 500 });
  }
  if (existingAdmin) {
    return NextResponse.json({ message: 'ชื่อผู้ใช้งานนี้ถูกใช้แล้ว' }, { status: 409 });
  }

  const trimmedName = String(name).trim();

  const { data: school, error } = await supabaseAdmin
    .from('schools')
    .insert({
      name: trimmedName,
      name_en: typeof nameEn === 'string' && nameEn.trim() ? nameEn.trim() : null,
      code: normalizedCode,
      email: normalizedEmail,
      created_by: caller.sub,
    })
    .select('id, name, name_en, code, email, logo_url, is_active, created_at')
    .single();

  if (error || !school) {
    return NextResponse.json(
      { message: error?.message ?? 'Failed to create school' },
      { status: 500 }
    );
  }

  await seedDefaultDepartments(school.id);

  const adminPassword = generatePassword();
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const { data: adminUser, error: adminError } = await supabaseAdmin
    .from('app_users')
    .insert({
      username: adminUsername,
      password_hash: adminPasswordHash,
      password_ciphertext: encryptCredential(adminPassword),
      must_change_password: true,
      email: normalizedEmail,
      first_name: 'ผู้ดูแลโรงเรียน',
      last_name: trimmedName,
      role: 'school_admin',
      school_id: school.id,
      is_active: true,
    })
    .select(
      'id, username, email, first_name, last_name, role, school_id, auth_user_id, auth_login_email, auth_role'
    )
    .single();

  if (adminError || !adminUser) {
    return NextResponse.json(
      {
        school,
        adminCreated: false,
        message: `สร้างโรงเรียนสำเร็จ แต่สร้างบัญชีผู้ดูแลไม่สำเร็จ: ${adminError?.message ?? 'ไม่พบข้อมูลบัญชีที่สร้าง'}`,
      },
      { status: 201 }
    );
  }

  const linkedAdmin = await linkStaffToSupabaseAuth(adminUser, adminPassword);
  if (!linkedAdmin.ok) {
    await supabaseAdmin.from('app_users').delete().eq('id', adminUser.id);
    return NextResponse.json(
      {
        school,
        adminCreated: false,
        message: `สร้างโรงเรียนสำเร็จ แต่สร้าง Supabase Auth ของผู้ดูแลไม่สำเร็จ: ${linkedAdmin.message}`,
      },
      { status: 201 }
    );
  }

  let emailSent = true;
  let emailErrorMessage: string | undefined;
  try {
    await sendSchoolInviteEmail({
      to: normalizedEmail,
      schoolName: trimmedName,
      schoolCode: normalizedCode,
      adminUsername,
      adminPassword,
      signInUrl: new URL(paths.auth.jwt.signIn, request.url).toString(),
    });
  } catch (emailError) {
    console.error('Failed to send school invite email', emailError);
    if (
      emailError instanceof GmailEmailError ||
      (emailError instanceof Error && emailError.message === RESEND_GMAIL_SENDER_ERROR)
    ) {
      emailErrorMessage = emailError.message;
    }
    emailSent = false;
  }

  return NextResponse.json(
    {
      school,
      adminCreated: true,
      emailSent,
      emailError: emailErrorMessage,
      adminUsername,
      // Only sent back to the client when the invite email failed to send,
      // so the caller has a fallback way to hand over the credentials.
      adminPassword: emailSent ? undefined : adminPassword,
    },
    { status: 201 }
  );
}
import { GmailEmailError } from 'src/lib/gmail-email';
