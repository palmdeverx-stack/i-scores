import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { requireRole } from 'src/lib/auth-token';
import { GmailEmailError } from 'src/lib/gmail-email';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { RESEND_GMAIL_SENDER_ERROR } from 'src/lib/resend';
import { writeSecurityAudit } from 'src/lib/security-audit';
import { sendSchoolInviteEmail } from 'src/lib/school-invite-email';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์ส่งคำเชิญ' }, { status: 403 });

  const { id } = await params;
  const administratorId = new URL(request.url).searchParams.get('administratorId');
  const body = request.headers.get('content-type')?.includes('application/json')
    ? await request.json().catch(() => null)
    : {};
  const payload = z
    .object({
      temporaryPassword: z
        .string()
        .max(72)
        .refine((value) => value.trim().length >= 8 && Buffer.byteLength(value, 'utf8') <= 72)
        .optional(),
    })
    .safeParse(body);
  if (!payload.success) {
    return NextResponse.json(
      { message: 'รหัสผ่านชั่วคราวต้องมีอย่างน้อย 8 ตัวอักษรและไม่เกิน 72 ไบต์' },
      { status: 400 }
    );
  }
  const { temporaryPassword } = payload.data;
  if (
    !z.uuid().safeParse(id).success ||
    (administratorId && !z.uuid().safeParse(administratorId).success)
  ) {
    return NextResponse.json({ message: 'โรงเรียนหรือบัญชีผู้ดูแลไม่ถูกต้อง' }, { status: 400 });
  }
  const administratorQuery = supabaseAdmin
    .from('app_users')
    .select('id, username, email, is_active, must_change_password, auth_user_id')
    .eq('school_id', id)
    .eq('role', 'school_admin');
  const [schoolResult, administratorResult] = await Promise.all([
    supabaseAdmin
      .from('schools')
      .select('name, code, email, is_active')
      .eq('id', id)
      .eq('workspace_type', 'school')
      .maybeSingle(),
    administratorId
      ? administratorQuery.eq('id', administratorId).maybeSingle()
      : administratorQuery.order('created_at').order('id').limit(1).maybeSingle(),
  ]);

  if (schoolResult.error || administratorResult.error) {
    return NextResponse.json(
      { message: 'โหลดข้อมูลโรงเรียนหรือบัญชีผู้ดูแลไม่สำเร็จ' },
      { status: 500 }
    );
  }
  const school = schoolResult.data;
  const administrator = administratorResult.data;
  if (!school?.is_active || !administrator?.is_active) {
    return NextResponse.json(
      { message: 'ไม่พบโรงเรียนหรือบัญชีผู้ดูแลที่เปิดใช้งาน' },
      { status: 404 }
    );
  }

  const to = (administratorId || temporaryPassword ? administrator.email : school.email)?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ message: 'กรุณาบันทึกอีเมลผู้รับก่อนส่งคำเชิญ' }, { status: 409 });
  }

  if (temporaryPassword) {
    if (!administrator.must_change_password) {
      return NextResponse.json(
        { message: 'บัญชีนี้ตั้งรหัสผ่านของตัวเองแล้ว กรุณาส่งคำเชิญโดยใช้รหัสผ่านเดิม' },
        { status: 409 }
      );
    }
    if (administrator.auth_user_id) {
      const [auth, profiles, buyer] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(administrator.auth_user_id),
        supabaseAdmin
          .from('app_users')
          .select('id', { count: 'exact', head: true })
          .eq('auth_user_id', administrator.auth_user_id),
        supabaseAdmin
          .from('marketplace_users')
          .select('id', { count: 'exact', head: true })
          .eq('auth_user_id', administrator.auth_user_id),
      ]);
      if (auth.error || profiles.error || buyer.error) {
        return NextResponse.json({ message: 'ตรวจสอบบัญชีเข้าสู่ระบบไม่สำเร็จ' }, { status: 503 });
      }
      if (
        profiles.count !== 1 ||
        buyer.count !== 0 ||
        auth.data.user?.app_metadata?.app_user_id !== administrator.id ||
        auth.data.user.identities?.some((identity) => identity.provider !== 'email')
      ) {
        return NextResponse.json(
          {
            message:
              'บัญชีเข้าสู่ระบบนี้ใช้ร่วมกับบริการอื่น กรุณาตั้งรหัสผ่านจากหน้าผู้ดูแลโรงเรียน',
          },
          { status: 409 }
        );
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(administrator.auth_user_id, {
        password: temporaryPassword,
      });
      if (error)
        return NextResponse.json({ message: 'ตั้งรหัสผ่านชั่วคราวไม่สำเร็จ' }, { status: 502 });
    } else {
      const { data, error } = await supabaseAdmin
        .from('app_users')
        .update({
          password_hash: await bcrypt.hash(temporaryPassword, 10),
          password_ciphertext: null,
        })
        .eq('id', administrator.id)
        .eq('must_change_password', true)
        .is('auth_user_id', null)
        .select('id')
        .maybeSingle();
      if (error || !data)
        return NextResponse.json(
          { message: 'ตั้งรหัสผ่านชั่วคราวไม่สำเร็จ กรุณาโหลดข้อมูลใหม่' },
          { status: 409 }
        );
    }
    await writeSecurityAudit({
      action: 'school.invite_password_reissued',
      actorUserId: caller.sub,
      schoolId: id,
      request,
      targetType: 'app_user',
      targetId: administrator.id,
    });
  }

  try {
    await sendSchoolInviteEmail({
      to,
      schoolName: school.name,
      schoolCode: school.code,
      adminUsername: administrator.username,
      adminPassword: temporaryPassword,
      signInUrl: new URL(paths.auth.jwt.signIn, 'https://e-kru.com').toString(),
    });
  } catch (error) {
    console.error('Failed to resend school invitation', { schoolId: id, error });
    const message =
      error instanceof GmailEmailError ||
      (error instanceof Error && error.message === RESEND_GMAIL_SENDER_ERROR)
        ? error.message
        : 'ผู้ให้บริการอีเมลยังไม่รับคำขอส่ง กรุณาตรวจสอบการตั้งค่าแล้วลองอีกครั้ง';
    return NextResponse.json(
      {
        message: temporaryPassword
          ? `ตั้งรหัสผ่านใหม่แล้ว แต่ส่งอีเมลไม่สำเร็จ · ${message}`
          : message,
      },
      { status: 502 }
    );
  }

  await writeSecurityAudit({
    action: 'school.invite_resent',
    actorUserId: caller.sub,
    schoolId: id,
    request,
    targetType: 'app_user',
    targetId: administrator.id,
  });
  return NextResponse.json({ sent: true });
}
