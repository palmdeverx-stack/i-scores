import 'server-only';

import { supabaseAdmin } from './supabase-admin';

export async function listMarketplaceApps(buyerId: string) {
  const now = new Date().toISOString();
  const licenses = await supabaseAdmin
    .from('marketplace_user_licenses')
    .select('feature_keys')
    .eq('buyer_id', buyerId)
    .eq('status', 'active')
    .lte('starts_at', now)
    .gt('expires_at', now);
  if (licenses.error) throw new Error('Unable to load licenses');
  const features = [
    ...new Set<string>((licenses.data ?? []).flatMap((row) => row.feature_keys ?? [])),
  ];
  if (!features.length) return [];
  const apps = await supabaseAdmin
    .from('ekru_apps')
    .select('id,code,name,launch_path')
    .eq('is_active', true)
    .in('supported_scope', ['individual', 'both'])
    .in('required_feature_key', features)
    .order('name');
  if (apps.error) throw new Error('Unable to load apps');
  return (apps.data ?? []).map((app) => ({ ...app, available: app.code !== 'WORKSHEET_AI' }));
}
