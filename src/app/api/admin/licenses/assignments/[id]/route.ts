import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller?.schoolId) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const { id } = await params;
  const { data: assignment } = await supabaseAdmin
    .from('marketplace_teacher_license_assignments')
    .select(
      'id, license:marketplace_school_licenses!marketplace_teacher_license_assignments_license_id_fkey(school_id)'
    )
    .eq('id', id)
    .is('revoked_at', null)
    .maybeSingle();
  const license = assignment?.license as unknown as { school_id: string } | null;
  if (!assignment || license?.school_id !== caller.schoolId) {
    return NextResponse.json({ message: 'ไม่พบการจัดสรร License' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('marketplace_teacher_license_assignments')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

