import 'server-only';

import { supabaseAdmin } from './supabase-admin';

export function getTeacherWorkspaceOwner(teacherId: string, schoolId: string) {
  return supabaseAdmin
    .from('app_users')
    .select('auth_user_id')
    .eq('id', teacherId)
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .eq('is_active', true)
    .maybeSingle();
}
