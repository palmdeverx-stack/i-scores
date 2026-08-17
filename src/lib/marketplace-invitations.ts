import 'server-only';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { createNotifications } from 'src/lib/notifications';

// ----------------------------------------------------------------------

/** Creates the "you've been invited" notification for a specific invitation + recipient, unless one already exists. */
export async function notifyInvitationForAppUser(params: {
  invitationId: string;
  userId: string;
  schoolId: string;
  schoolName: string;
}): Promise<void> {
  const link = `/account/marketplace-invitations/${params.invitationId}`;
  const { count: existingCount } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', params.userId)
    .eq('link', link);
  if (existingCount) return;

  await createNotifications([
    {
      userId: params.userId,
      schoolId: params.schoolId,
      type: 'marketplace_invite',
      title: 'คำเชิญใช้ระบบ EKRU',
      body: `โรงเรียน ${params.schoolName} เชิญคุณเข้าใช้ระบบ EKRU ที่โรงเรียนมอบสิทธิ์ให้`,
      link,
    },
  ]);
}

/** Surfaces a pending Marketplace invitation as a notification the first time a matching teacher logs in. Best-effort — never throws. */
export async function notifyPendingMarketplaceInvitation(params: {
  userId: string;
  schoolId: string;
  email: string | null;
}): Promise<void> {
  if (!params.email) return;

  try {
    const now = new Date().toISOString();
    const { data: invitation } = await supabaseAdmin
      .from('marketplace_school_invitations')
      .select('id')
      .eq('school_id', params.schoolId)
      .ilike('invited_email', params.email)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .maybeSingle();
    if (!invitation) return;

    const link = `/account/marketplace-invitations/${invitation.id}`;
    const { count: existingCount } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .eq('link', link);
    if (existingCount) return;

    await createNotifications([
      {
        userId: params.userId,
        schoolId: params.schoolId,
        type: 'marketplace_invite',
        title: 'คำเชิญใช้ระบบ EKRU',
        body: 'คุณมีคำเชิญใช้ระบบ EKRU ของโรงเรียนที่รอการตอบรับ กดเพื่อดูรายละเอียด',
        link,
      },
    ]);
  } catch (error) {
    console.error('Failed to check pending Marketplace invitation', error);
  }
}
