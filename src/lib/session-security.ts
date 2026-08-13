import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export type SessionStatus = 'active' | 'inactive' | 'error';

function issuedAfterRevocation(payload: AppTokenPayload, revokedAt: string | null): boolean {
  if (!revokedAt) return true;
  if (!payload.iat) return false;
  return payload.iat >= Math.floor(new Date(revokedAt).getTime() / 1000);
}

/**
 * 'error' means the liveness check itself failed (DB unreachable, timeout, etc.) and is
 * distinct from 'inactive' (confirmed revoked/disabled) — callers must not treat a failed
 * check as proof the session is invalid.
 */
export async function getSessionStatus(payload: AppTokenPayload): Promise<SessionStatus> {
  if (payload.role === 'marketplace_user') {
    const { data, error } = await supabaseAdmin
      .from('marketplace_users')
      .select('id, is_active, session_revoked_at')
      .eq('id', payload.sub)
      .maybeSingle();
    if (error) return 'error';
    return data?.is_active && issuedAfterRevocation(payload, data.session_revoked_at)
      ? 'active'
      : 'inactive';
  }

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('id, role, school_id, is_active, student_status, session_revoked_at')
    .eq('id', payload.sub)
    .maybeSingle();
  if (error) return 'error';
  if (
    !user?.is_active ||
    user.role !== payload.role ||
    user.school_id !== payload.schoolId ||
    (user.role === 'student' && (user.student_status ?? 'studying') !== 'studying') ||
    !issuedAfterRevocation(payload, user.session_revoked_at)
  ) {
    return 'inactive';
  }

  if (!user.school_id || user.role === 'master_admin') return 'active';
  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .select('is_active')
    .eq('id', user.school_id)
    .maybeSingle();
  if (schoolError) return 'error';
  return school?.is_active ? 'active' : 'inactive';
}
