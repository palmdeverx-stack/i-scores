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
  const { data: member } = await supabaseAdmin
    .from('marketplace_school_members')
    .select('id, school_id')
    .eq('id', id)
    .maybeSingle();
  if (!member || member.school_id !== caller.schoolId) {
    return NextResponse.json({ message: 'ไม่พบผู้ใช้ระบบ E-KRU นี้' }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from('marketplace_school_members').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
