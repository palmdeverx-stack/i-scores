import 'server-only';

import type { Curriculum } from '../types';
import type { AppTokenPayload } from 'src/lib/auth-token';

import { supabaseAdmin } from 'src/lib/supabase-admin';

export async function getVisibleCurriculum(caller: AppTokenPayload, id: string) {
  const { data, error } = await supabaseAdmin
    .from('curricula')
    .select('id, code, name, version, curriculum_type, scope, status, school_id, owner_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const visible =
    data.owner_id === caller.sub ||
    (data.scope === 'school' && !!caller.schoolId && data.school_id === caller.schoolId) ||
    (['system', 'public'].includes(data.scope) && data.status === 'published');
  return visible ? (data as Curriculum) : null;
}
