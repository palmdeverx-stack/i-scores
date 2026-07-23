import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { signAppToken, toPublicUser } from 'src/lib/auth-token';
import { isSubscriptionUsable, loadSchoolSubscription } from 'src/lib/school-subscription';

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

  const studentCannotAccess =
    user.role === 'student' && (user.student_status ?? 'studying') !== 'studying';

  if (user.is_active === false || studentCannotAccess) {
    return NextResponse.json(
      {
        message: studentCannotAccess
          ? 'สถานะนักเรียนไม่สามารถเข้าใช้งานระบบได้ กรุณาติดต่อผู้ดูแลโรงเรียน'
          : 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลโรงเรียน',
      },
      { status: 403 }
    );
  }

  if (user.role !== 'master_admin') {
    const [{ data: school }, subscription] = await Promise.all([
      supabaseAdmin.from('schools').select('is_active').eq('id', user.school_id).maybeSingle(),
      loadSchoolSubscription(user.school_id),
    ]);
    if (!school?.is_active) {
      return NextResponse.json(
        { message: 'โรงเรียนถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }
    if (!isSubscriptionUsable(subscription)) {
      return NextResponse.json(
        { message: 'แพ็กเกจโรงเรียนหมดอายุหรือถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }
  }

  const accessToken = signAppToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    schoolId: user.school_id,
  });

  return NextResponse.json({ accessToken, user: toPublicUser(user) });
}
