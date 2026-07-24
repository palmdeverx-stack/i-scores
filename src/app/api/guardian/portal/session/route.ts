import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  verifyGuardianPortalToken,
  signGuardianPortalSessionToken,
} from 'src/lib/guardian-portal-token';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = verifyGuardianPortalToken(searchParams.get('token') ?? '', 'link');
  if (!payload) {
    return NextResponse.redirect(new URL('/guardian/student/?error=expired', request.url));
  }

  const { count, error } = await supabaseAdmin
    .from('student_guardians')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', payload.schoolId)
    .eq('line_user_id', payload.lineUserId);
  if (error || !count) {
    return NextResponse.redirect(new URL('/guardian/student/?error=not-linked', request.url));
  }

  const response = NextResponse.redirect(new URL('/guardian/student/', request.url));
  response.cookies.set({
    name: 'guardian_portal_session',
    value: signGuardianPortalSessionToken(payload.schoolId, payload.lineUserId),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  return response;
}
