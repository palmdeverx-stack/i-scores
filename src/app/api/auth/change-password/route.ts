import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { encryptCredential } from 'src/lib/credential-cipher';
import { toPublicUser, getBearerToken, verifyAppToken } from 'src/lib/auth-token';

// ----------------------------------------------------------------------

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const payload = token ? verifyAppToken(token) : null;

  if (!payload) {
    return NextResponse.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const { newPassword } = await request.json();

  if (!newPassword || String(newPassword).length < 6) {
    return NextResponse.json(
      { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .update({
      password_hash: passwordHash,
      password_ciphertext:
        payload.role === 'teacher' || payload.role === 'student'
          ? encryptCredential(newPassword)
          : null,
      must_change_password: false,
    })
    .eq('id', payload.sub)
    .select('*')
    .single();

  if (error || !user) {
    return NextResponse.json(
      { message: error?.message ?? 'Failed to change password' },
      { status: 500 }
    );
  }

  return NextResponse.json({ user: toPublicUser(user) });
}
