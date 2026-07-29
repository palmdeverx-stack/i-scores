import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { requireRole } from 'src/lib/auth-token';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const caller = requireRole(request, ['school_admin']);
  if (!caller) {
    const signInUrl = new URL(paths.auth.jwt.signIn, request.url);
    signInUrl.searchParams.set('returnTo', '/onboarding/school');
    return NextResponse.redirect(signInUrl);
  }

  const destination = new URL(paths.admin.school, request.url);
  destination.searchParams.set('onboarding', 'marketplace');
  return NextResponse.redirect(destination);
}
