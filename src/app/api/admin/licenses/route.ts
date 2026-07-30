import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

const INVITATION_SELECT =
  'id, marketplace_user_id, invited_email, membership_role, expires_at, accepted_at, revoked_at, created_at, last_sent_at, email_delivery_status';
const LEGACY_INVITATION_SELECT =
  'id, marketplace_user_id, invited_email, membership_role, expires_at, accepted_at, revoked_at, created_at';

async function listSchoolInvitations(schoolId: string) {
  const result = await supabaseAdmin
    .from('marketplace_school_invitations')
    .select(INVITATION_SELECT)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  const isMissingDeliveryColumn =
    !!result.error &&
    (result.error.code === '42703' || result.error.code === 'PGRST204') &&
    (result.error.message.includes('last_sent_at') ||
      result.error.message.includes('email_delivery_status'));

  if (!isMissingDeliveryColumn) return result;

  const legacyResult = await supabaseAdmin
    .from('marketplace_school_invitations')
    .select(LEGACY_INVITATION_SELECT)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  return {
    ...legacyResult,
    data:
      legacyResult.data?.map((invitation) => ({
        ...invitation,
        last_sent_at: null,
        email_delivery_status: 'pending' as const,
      })) ?? null,
  };
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const [licensesResult, assignmentsResult, teachersResult, membersResult, invitationsResult] =
    await Promise.all([
      supabaseAdmin
        .from('marketplace_school_licenses')
        .select(
          `id, school_id, product_id, license_scope, feature_keys, seat_count,
           starts_at, expires_at, status, created_at,
           product:marketplace_products!marketplace_school_licenses_product_id_fkey(
             id, title, title_en, cover_url
           )`
        )
        .eq('school_id', caller.schoolId)
        .order('expires_at', { ascending: false }),
      supabaseAdmin
        .from('marketplace_teacher_license_assignments')
        .select('id, license_id, teacher_id, assigned_at, revoked_at')
        .is('revoked_at', null),
      supabaseAdmin
        .from('app_users')
        .select(
          'id, username, email, name_prefix, first_name, last_name, position_title, is_active, auth_user_id'
        )
        .eq('school_id', caller.schoolId)
        .eq('role', 'teacher')
        .order('first_name'),
      supabaseAdmin
        .from('marketplace_school_members')
        .select(
          `id, marketplace_user_id, membership_role, joined_at,
           user:marketplace_users!marketplace_school_members_marketplace_user_id_fkey(
             id, email, username, first_name, last_name, is_active, auth_user_id
           )`
        )
        .eq('school_id', caller.schoolId)
        .order('joined_at', { ascending: false }),
      listSchoolInvitations(caller.schoolId),
    ]);

  const error =
    licensesResult.error ||
    assignmentsResult.error ||
    teachersResult.error ||
    membersResult.error ||
    invitationsResult.error;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const licenseIds = new Set((licensesResult.data ?? []).map((license) => license.id));
  const assignments = (assignmentsResult.data ?? []).filter((assignment) =>
    licenseIds.has(assignment.license_id)
  );
  const licenses = (licensesResult.data ?? []).map((license) => {
    const usedSeats = assignments.filter(
      (assignment) => assignment.license_id === license.id
    ).length;
    return {
      ...license,
      used_seats: usedSeats,
      is_current:
        license.status === 'active' &&
        license.starts_at <= now &&
        license.expires_at > now,
    };
  });
  const invitations = (invitationsResult.data ?? []).map((invitation) => ({
    ...invitation,
    invitation_status: invitation.accepted_at
      ? 'accepted'
      : invitation.revoked_at
        ? 'revoked'
        : invitation.expires_at <= now
          ? 'expired'
          : 'pending',
  }));

  return NextResponse.json({
    licenses,
    assignments,
    teachers: teachersResult.data ?? [],
    members: membersResult.data ?? [],
    invitations,
  });
}
