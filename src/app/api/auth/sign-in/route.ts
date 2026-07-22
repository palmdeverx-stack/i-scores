import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { signAppToken, toPublicUser } from 'src/lib/auth-token';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' }, { status: 400 });
  }

  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .ilike('username', username)
    .single();

  const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));

  if (!user || !passwordMatches) {
    return NextResponse.json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  const accessToken = signAppToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    schoolId: user.school_id,
  });

  return NextResponse.json({ accessToken, user: toPublicUser(user) });
}
