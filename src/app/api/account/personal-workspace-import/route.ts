import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';
import { findImportablePersonalWorkspace } from 'src/lib/personal-workspace-import';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
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

  return NextResponse.json({ importable });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['teacher']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const includeStudents = body?.includeStudents !== false;

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
    return NextResponse.json({ message: 'ไม่พบข้อมูลพื้นที่ส่วนตัวที่นำเข้าได้' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.rpc('import_personal_workspace_data', {
    p_source_school_id: importable.sourceSchoolId,
    p_target_school_id: caller.schoolId,
    p_target_teacher_id: caller.sub,
    p_include_students: includeStudents,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}
