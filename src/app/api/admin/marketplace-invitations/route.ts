import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';
import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { getResendFromEmail, isResendApiKeyConfigured } from 'src/lib/resend';
import { sendMarketplaceSchoolInviteEmail } from 'src/lib/marketplace-invite-email';

// ----------------------------------------------------------------------

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'เฉพาะผู้ดูแลโรงเรียนเท่านั้นที่ส่งคำเชิญได้' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'กรุณากรอกอีเมลให้ถูกต้อง' }, { status: 400 });
  }
  if (!CONFIG.marketplaceUrl) {
    return NextResponse.json(
      { message: 'ยังไม่ได้กำหนด NEXT_PUBLIC_MARKETPLACE_URL' },
      { status: 503 }
    );
  }
  if (!isResendApiKeyConfigured() || !(await getResendFromEmail())) {
    return NextResponse.json(
      { message: 'ยังไม่ได้ตั้งค่า Resend API Key หรืออีเมลผู้ส่งสำหรับส่งอีเมลจริง' },
      { status: 503 }
    );
  }

  const [{ data: marketplaceUser }, { data: school }, { data: inviter }] = await Promise.all([
    supabaseAdmin
      .from('marketplace_users')
      .select('id, email, username, first_name, last_name')
      .ilike('email', email)
      .maybeSingle(),
    supabaseAdmin.from('schools').select('id, name').eq('id', caller.schoolId).maybeSingle(),
    supabaseAdmin
      .from('app_users')
      .select('first_name, last_name, username')
      .eq('id', caller.sub)
      .maybeSingle(),
  ]);

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
      { message: 'ผู้ใช้นี้เป็นสมาชิก Marketplace ของโรงเรียนอยู่แล้ว' },
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
    email_delivery_status: 'pending',
    email_delivery_error: null,
  };
  const invitationResult = existingInvitation
    ? await supabaseAdmin
        .from('marketplace_school_invitations')
        .update(invitationPayload)
        .eq('id', existingInvitation.id)
        .select('id, invited_email, expires_at, email_delivery_status, last_sent_at')
        .single()
    : await supabaseAdmin
        .from('marketplace_school_invitations')
        .insert(invitationPayload)
        .select('id, invited_email, expires_at, email_delivery_status, last_sent_at')
        .single();
  const { data: invitation, error } = invitationResult;

  if (error || !invitation) {
    return NextResponse.json(
      { message: error?.message ?? 'ไม่สามารถสร้างคำเชิญได้' },
      { status: 500 }
    );
  }

  const inviteUrl = new URL('/invitations/accept', CONFIG.marketplaceUrl);
  inviteUrl.searchParams.set('token', rawToken);
  inviteUrl.searchParams.set('email', email);
  if (!marketplaceUser) inviteUrl.searchParams.set('mode', 'signup');
  const inviterName =
    [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ') ||
    inviter?.username ||
    'ผู้ดูแลโรงเรียน';

  try {
    await sendMarketplaceSchoolInviteEmail({
      to: email,
      schoolName: school.name,
      inviterName,
      inviteUrl: inviteUrl.toString(),
      expiresAt,
      recipientHasAccount: Boolean(marketplaceUser),
    });
  } catch (emailError) {
    console.error('Failed to send Marketplace school invitation', emailError);
    const message = emailError instanceof Error ? emailError.message : 'Unknown email error';
    await supabaseAdmin
      .from('marketplace_school_invitations')
      .update({
        email_delivery_status: 'failed',
        email_delivery_error: message.slice(0, 500),
      })
      .eq('id', invitation.id);
    return NextResponse.json(
      { message: 'สร้างคำเชิญแล้ว แต่ส่งอีเมลไม่สำเร็จ กรุณาลองส่งอีกครั้ง' },
      { status: 502 }
    );
  }

  const sentAt = new Date().toISOString();
  const { error: sentStatusError } = await supabaseAdmin
    .from('marketplace_school_invitations')
    .update({
      email_delivery_status: 'sent',
      email_delivery_error: null,
      last_sent_at: sentAt,
    })
    .eq('id', invitation.id);
  if (sentStatusError) {
    console.error('Failed to update Marketplace invitation delivery status', sentStatusError);
  }

  return NextResponse.json({
    invitation: {
      ...invitation,
      email_delivery_status: 'sent',
      last_sent_at: sentAt,
    },
    marketplaceUser: {
      id: marketplaceUser?.id ?? null,
      email,
      displayName:
        marketplaceUser
          ? [marketplaceUser.first_name, marketplaceUser.last_name].filter(Boolean).join(' ') ||
            marketplaceUser.username
          : null,
      accountExists: Boolean(marketplaceUser),
    },
  });
}
