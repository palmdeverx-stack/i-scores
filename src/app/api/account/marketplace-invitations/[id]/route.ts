import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const [{ data: user }, { data: invitation }] = await Promise.all([
    supabaseAdmin.from('app_users').select('email, school_id').eq('id', caller.sub).maybeSingle(),
    supabaseAdmin
      .from('marketplace_school_invitations')
      .select(
        'id, invited_email, school_id, expires_at, accepted_at, revoked_at, school:schools!marketplace_school_invitations_school_id_fkey(name)'
      )
      .eq('id', id)
      .maybeSingle(),
  ]);

  if (
    !user?.email ||
    !invitation ||
    invitation.school_id !== user.school_id ||
    invitation.invited_email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return NextResponse.json({ message: 'ไม่พบคำเชิญนี้' }, { status: 404 });
  }

  const now = new Date();
  const status = invitation.accepted_at
    ? 'accepted'
    : invitation.revoked_at
      ? 'revoked'
      : new Date(invitation.expires_at) <= now
        ? 'expired'
        : 'pending';

  const school = Array.isArray(invitation.school) ? invitation.school[0] : invitation.school;

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      invitedEmail: invitation.invited_email,
      expiresAt: invitation.expires_at,
      status,
      schoolName: school?.name ?? '',
    },
  });
}
