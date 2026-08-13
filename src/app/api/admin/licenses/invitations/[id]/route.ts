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
  const { data: invitation } = await supabaseAdmin
    .from('marketplace_school_invitations')
    .select('id, school_id, accepted_at')
    .eq('id', id)
    .maybeSingle();
  if (!invitation || invitation.school_id !== caller.schoolId) {
    return NextResponse.json({ message: 'ไม่พบคำเชิญนี้' }, { status: 404 });
  }
  if (invitation.accepted_at) {
    return NextResponse.json({ message: 'คำเชิญนี้ถูกตอบรับไปแล้ว ยกเลิกไม่ได้' }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from('marketplace_school_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
