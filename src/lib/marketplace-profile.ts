import 'server-only';

import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

export type MarketplaceProfile = {
  id: string;
  auth_user_id: string;
  email: string;
};

/** Finds or creates the marketplace_users row for a given Supabase Auth user, matching by auth_user_id then by email. */
export async function ensureMarketplaceUser(params: {
  authUserId: string;
  email: string;
  usernameHint?: string;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<MarketplaceProfile> {
  const email = params.email.trim().toLowerCase();

  const { data: byAuthId } = await supabaseAdmin
    .from('marketplace_users')
    .select('id, auth_user_id, email')
    .eq('auth_user_id', params.authUserId)
    .maybeSingle();
  if (byAuthId) return byAuthId;

  const { data: byEmail } = await supabaseAdmin
    .from('marketplace_users')
    .select('id, auth_user_id, email')
    .ilike('email', email)
    .maybeSingle();
  if (byEmail) {
    if (byEmail.auth_user_id !== params.authUserId) {
      const { data: previousAuth } = await supabaseAdmin.auth.admin.getUserById(
        byEmail.auth_user_id
      );
      if (previousAuth.user) {
        // A Marketplace profile already exists for this email under a different
        // Supabase Auth identity (e.g. this person signed in via Google once and
        // via password separately) — use the existing profile as-is rather than
        // rejecting. Both sessions already proved ownership of the same email.
        return byEmail;
      }

      const { data: recoveredProfile, error: recoverError } = await supabaseAdmin
        .from('marketplace_users')
        .update({ auth_user_id: params.authUserId })
        .eq('id', byEmail.id)
        .eq('auth_user_id', byEmail.auth_user_id)
        .select('id, auth_user_id, email')
        .maybeSingle();
      if (recoverError || !recoveredProfile) {
        throw new Error(recoverError?.message ?? 'ไม่สามารถกู้คืนการเชื่อมบัญชี Marketplace ได้');
      }
      return recoveredProfile;
    }
    return byEmail;
  }

  const usernamePrefix =
    params.usernameHint?.trim() ||
    email.split('@')[0].replaceAll(/[^a-zA-Z0-9._-]/g, '') ||
    'user';
  const username = `${usernamePrefix}_${params.authUserId.slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from('marketplace_users')
    .insert({
      auth_user_id: params.authUserId,
      username,
      email,
      first_name: params.firstName || null,
      last_name: params.lastName || null,
      role: 'marketplace_user',
      is_active: true,
    })
    .select('id, auth_user_id, email')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'ไม่สามารถสร้างโปรไฟล์ Marketplace ได้');
  }
  return data;
}
