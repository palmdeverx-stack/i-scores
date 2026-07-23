import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { toPublicUser, getBearerToken, verifyAppToken } from 'src/lib/auth-token';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const token = getBearerToken(request);
  const payload = token ? verifyAppToken(token) : null;

  if (!payload) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .eq('id', payload.sub)
    .single();

  const studentCannotAccess =
    user?.role === 'student' && (user.student_status ?? 'studying') !== 'studying';

  if (!user || user.is_active === false || studentCannotAccess) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}
