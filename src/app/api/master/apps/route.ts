import { NextResponse } from 'next/server';

import { requireRole } from 'src/lib/auth-token';
import { supabaseAdmin } from 'src/lib/supabase-admin';

import { parseAppPayload } from './app-payload';

// ----------------------------------------------------------------------

const FIELDS =
  'id, code, name, launch_path, required_feature_key, supported_scope, is_active, created_at, updated_at';

export async function GET(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('ekru_apps')
    .select(FIELDS)
    .order('code');
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ apps: data ?? [] });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  const payload = parseAppPayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json({ message: 'ข้อมูลระบบย่อยไม่ถูกต้อง' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ekru_apps')
    .insert(payload)
    .select(FIELDS)
    .single();
  if (error || !data) {
    return NextResponse.json(
      { message: error?.code === '23505' ? 'Code, Path หรือ Feature ถูกใช้แล้ว' : error?.message },
      { status: error?.code === '23505' ? 409 : 500 }
    );
  }
  return NextResponse.json({ app: data }, { status: 201 });
}
