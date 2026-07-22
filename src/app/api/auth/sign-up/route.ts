import { NextResponse } from 'next/server';

// ----------------------------------------------------------------------

/**
 * Public self sign-up is disabled: every account now belongs to a school
 * (master_admin creates schools + school_admin, school_admin creates
 * teachers/students), so accounts are always provisioned by an admin.
 */
export async function POST() {
  return NextResponse.json(
    { message: 'ปิดการสมัครสมาชิกด้วยตนเอง กรุณาติดต่อผู้ดูแลโรงเรียนให้สร้างบัญชีให้' },
    { status: 403 }
  );
}
