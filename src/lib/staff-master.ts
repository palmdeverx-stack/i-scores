import 'server-only';

import { supabaseAdmin } from './supabase-admin';

// ----------------------------------------------------------------------

export type StaffMasterCategory = 'staff_type' | 'position' | 'academic_rank';

export async function isActiveStaffMasterValue(
  schoolId: string,
  category: StaffMasterCategory,
  value: string
) {
  const valueColumn = category === 'staff_type' ? 'code' : 'name';
  const { data } = await supabaseAdmin
    .from('staff_master_items')
    .select('id')
    .eq('school_id', schoolId)
    .eq('category', category)
    .eq(valueColumn, value)
    .eq('is_active', true)
    .maybeSingle();

  return !!data;
}
