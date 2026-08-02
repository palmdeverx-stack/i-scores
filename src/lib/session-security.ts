import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

function issuedAfterRevocation(payload: AppTokenPayload, revokedAt: string | null): boolean {
  if (!revokedAt) return true;
  if (!payload.iat) return false;
  return payload.iat >= Math.floor(new Date(revokedAt).getTime() / 1000);
}

export async function isActiveSession(payload: AppTokenPayload): Promise<boolean> {
  if (payload.role === 'marketplace_user') {
    const { data, error } = await supabaseAdmin
      .from('marketplace_users')
      .select('id, is_active, session_revoked_at')
      .eq('id', payload.sub)
      .maybeSingle();
    return Boolean(
      !error && data?.is_active && issuedAfterRevocation(payload, data.session_revoked_at)
    );
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('id, role, school_id, is_active, student_status, session_revoked_at')
    .eq('id', payload.sub)
    .maybeSingle();
  if (
    error ||
    !user?.is_active ||
    user.role !== payload.role ||
    user.school_id !== payload.schoolId ||
    (user.role === 'student' && (user.student_status ?? 'studying') !== 'studying') ||
    !issuedAfterRevocation(payload, user.session_revoked_at)
  ) {
    return false;
  }

  if (!user.school_id || user.role === 'master_admin') return true;
  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .select('is_active')
    .eq('id', user.school_id)
    .maybeSingle();
  return Boolean(!schoolError && school?.is_active);
}
