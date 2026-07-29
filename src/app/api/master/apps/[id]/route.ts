import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

import { parseAppPayload } from '../app-payload';

// ----------------------------------------------------------------------

type RouteParams = { params: Promise<{ id: string }> };
const FIELDS =
  'id, code, name, launch_path, required_feature_key, supported_scope, is_active, created_at, updated_at';

export async function PATCH(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const payload = parseAppPayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ message: 'ข้อมูลระบบย่อยไม่ถูกต้อง' }, { status: 400 });
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('ekru_apps')
    .update(payload)
    .eq('id', id)
    .select(FIELDS)
    .single();
  if (error || !data) {
    return NextResponse.json(
      { message: error?.code === '23505' ? 'Code, Path หรือ Feature ถูกใช้แล้ว' : error?.message },
      { status: error?.code === '23505' ? 409 : 500 }
    );
  }
  return NextResponse.json({ app: data });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { id } = await params;
  const { count } = await supabaseAdmin
    .from('ekru_app_workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('app_id', id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { message: 'ระบบนี้มี Workspace แล้ว กรุณาปิดใช้งานแทนการลบ' },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin.from('ekru_apps').delete().eq('id', id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
