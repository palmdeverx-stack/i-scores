import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { notifyInvitationForAppUser } from 'src/lib/marketplace-invitations';

// ----------------------------------------------------------------------

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const [{ data: invitation }, { data: school }] = await Promise.all([
    supabaseAdmin
      .from('marketplace_school_invitations')
      .select('id, school_id, invited_email, accepted_at, revoked_at')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin.from('schools').select('name').eq('id', caller.schoolId).maybeSingle(),
  ]);
  if (!invitation || invitation.school_id !== caller.schoolId) {
    return NextResponse.json({ message: 'ไม่พบคำเชิญนี้' }, { status: 404 });
  }
  if (invitation.accepted_at || invitation.revoked_at) {
    return NextResponse.json({ message: 'คำเชิญนี้ใช้งานไม่ได้แล้ว ส่งใหม่ไม่ได้' }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
  const { error } = await supabaseAdmin
    .from('marketplace_school_invitations')
    .update({ expires_at: expiresAt })
    .eq('id', id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const { data: invitedAppUser } = await supabaseAdmin
    .from('app_users')
    .select('id, is_active')
    .eq('school_id', caller.schoolId)
    .ilike('email', invitation.invited_email)
    .maybeSingle();

  if (invitedAppUser?.is_active && school) {
    // Resend should always surface a fresh, unread notification — even if the
    // recipient already read (or dismissed) one for this same invitation.
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', invitedAppUser.id)
      .eq('link', `/account/marketplace-invitations/${invitation.id}`);

    await notifyInvitationForAppUser({
      invitationId: invitation.id,
      userId: invitedAppUser.id,
      schoolId: caller.schoolId,
      schoolName: school.name,
    });
  }

  return NextResponse.json({ success: true, expiresAt, notified: Boolean(invitedAppUser?.is_active) });
}
