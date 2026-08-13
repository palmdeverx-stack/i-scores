import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { notifyInvitationForAppUser } from 'src/lib/marketplace-invitations';

// ----------------------------------------------------------------------

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json(
      { message: 'เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่ส่งคำเชิญได้' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'กรุณากรอกอีเมลให้ถูกต้อง' }, { status: 400 });
  }

  const [{ data: marketplaceUser }, { data: school }, { data: invitedAppUser }] = await Promise.all(
    [
      supabaseAdmin
        .from('marketplace_users')
        .select('id, email, username, first_name, last_name')
        .ilike('email', email)
        .maybeSingle(),
      supabaseAdmin.from('schools').select('id, name').eq('id', caller.schoolId).maybeSingle(),
      supabaseAdmin
        .from('app_users')
        .select('id, is_active')
        .eq('school_id', caller.schoolId)
        .ilike('email', email)
        .maybeSingle(),
    ]
  );

  if (!school) {
    return NextResponse.json({ message: 'ไม่พบข้อมูลโรงเรียน' }, { status: 404 });
  }

  const { data: member } = marketplaceUser
    ? await supabaseAdmin
        .from('marketplace_school_members')
        .select('id')
        .eq('school_id', caller.schoolId)
        .eq('marketplace_user_id', marketplaceUser.id)
        .maybeSingle()
    : { data: null };
  if (member) {
    return NextResponse.json(
      { message: 'ผู้ใช้นี้เชื่อมกับระบบ E-KRU ของโรงเรียนอยู่แล้ว' },
      { status: 409 }
    );
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();

  const { data: existingInvitation } = await supabaseAdmin
    .from('marketplace_school_invitations')
    .select('id')
    .eq('school_id', caller.schoolId)
    .ilike('invited_email', email)
    .maybeSingle();

  const invitationPayload = {
    school_id: caller.schoolId,
    marketplace_user_id: marketplaceUser?.id ?? null,
    invited_email: email,
    invited_by: caller.sub,
    membership_role: 'teacher',
    token_hash: tokenHash,
    expires_at: expiresAt,
    accepted_at: null,
    revoked_at: null,
  };
  const invitationResult = existingInvitation
    ? await supabaseAdmin
        .from('marketplace_school_invitations')
        .update(invitationPayload)
        .eq('id', existingInvitation.id)
        .select('id, invited_email, expires_at')
        .single()
    : await supabaseAdmin
        .from('marketplace_school_invitations')
        .insert(invitationPayload)
        .select('id, invited_email, expires_at')
        .single();
  const { data: invitation, error } = invitationResult;

  if (error || !invitation) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถสร้างคำเชิญได้' },
      { status: 500 }
    );
  }

  // No email is sent — the invitee accepts in-app instead. If they already have a
  // teacher/school_admin account in this school, surface it as a notification now;
  // otherwise it's picked up the next time that email signs in (see sign-in route).
  if (invitedAppUser?.is_active) {
    await notifyInvitationForAppUser({
      invitationId: invitation.id,
      userId: invitedAppUser.id,
      schoolId: caller.schoolId,
      schoolName: school.name,
    });
  }

  return NextResponse.json({
    invitation,
    marketplaceUser: {
      id: marketplaceUser?.id ?? null,
      email,
      displayName: marketplaceUser
        ? [marketplaceUser.first_name, marketplaceUser.last_name].filter(Boolean).join(' ') ||
          marketplaceUser.username
        : null,
      accountExists: Boolean(marketplaceUser),
      notified: Boolean(invitedAppUser?.is_active),
    },
  });
}
