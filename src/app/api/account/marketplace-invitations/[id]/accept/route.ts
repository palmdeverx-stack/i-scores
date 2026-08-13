import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { ensureMarketplaceUser } from 'src/lib/marketplace-profile';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['teacher', 'school_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const [{ data: user }, { data: invitation }] = await Promise.all([
    supabaseAdmin
      .from('app_users')
      .select('email, school_id, auth_user_id, username, first_name, last_name')
      .eq('id', caller.sub)
      .maybeSingle(),
    supabaseAdmin
      .from('marketplace_school_invitations')
      .select('id, invited_email, school_id, membership_role, expires_at, accepted_at, revoked_at')
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
  if (invitation.accepted_at || invitation.revoked_at) {
    return NextResponse.json({ message: 'คำเชิญนี้ถูกใช้ไปแล้วหรือถูกยกเลิก' }, { status: 409 });
  }
  if (new Date(invitation.expires_at) <= new Date()) {
    return NextResponse.json({ message: 'คำเชิญนี้หมดอายุแล้ว' }, { status: 409 });
  }
  if (!user.auth_user_id) {
    return NextResponse.json(
      { message: 'บัญชีนี้ยังไม่เชื่อมกับ Supabase Auth กรุณาเข้าสู่ระบบใหม่อีกครั้งแล้วลองใหม่' },
      { status: 409 }
    );
  }

  let marketplaceProfile;
  try {
    marketplaceProfile = await ensureMarketplaceUser({
      authUserId: user.auth_user_id,
      email: user.email,
      usernameHint: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    });
  } catch (profileError) {
    return NextResponse.json(
      {
        message:
          profileError instanceof Error
            ? profileError.message
            : 'ไม่สามารถตรวจสอบบัญชี Marketplace ได้',
      },
      { status: 409 }
    );
  }

  const { error: memberError } = await supabaseAdmin.from('marketplace_school_members').upsert(
    {
      school_id: invitation.school_id,
      marketplace_user_id: marketplaceProfile.id,
      membership_role: invitation.membership_role,
    },
    { onConflict: 'school_id,marketplace_user_id' }
  );
  if (memberError) {
    return NextResponse.json({ message: memberError.message }, { status: 500 });
  }

  const { error: acceptError } = await supabaseAdmin
    .from('marketplace_school_invitations')
    .update({ marketplace_user_id: marketplaceProfile.id, accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);
  if (acceptError) {
    return NextResponse.json({ message: acceptError.message }, { status: 500 });
  }

  await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', caller.sub)
    .eq('link', `/account/marketplace-invitations/${invitation.id}`)
    .is('read_at', null);

  return NextResponse.json({ success: true });
}
