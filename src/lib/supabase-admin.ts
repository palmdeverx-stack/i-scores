import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

/**
 * Server-only client authenticated with the service role key.
 * Bypasses Row Level Security — never import this from client components.
 */
export const supabaseAdmin = createClient(CONFIG.supabase.url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
