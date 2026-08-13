import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { findImportablePersonalWorkspace } from 'src/lib/personal-workspace-import';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('email')
    .eq('id', caller.sub)
    .maybeSingle();

  const importable = await findImportablePersonalWorkspace({
    email: user?.email ?? null,
    excludeAppUserId: caller.sub,
  });
  if (!importable) {
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin
    .from('schools')
    .update({ import_dismissed_at: new Date().toISOString() })
    .eq('id', importable.sourceSchoolId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
