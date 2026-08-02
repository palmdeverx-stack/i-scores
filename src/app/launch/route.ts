import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { requireRole } from 'src/lib/auth-token';
import { resolveEkruAppAccess } from 'src/lib/ekru-app-access';

// ----------------------------------------------------------------------

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appCode = url.searchParams.get('app')?.trim().toUpperCase() ?? '';
  if (!/^[A-Z0-9_]+$/.test(appCode)) {
    return NextResponse.redirect(new URL(paths.page404, request.url));
  }

  const caller = requireRole(request, [
    'master_admin',
    'school_admin',
    'teacher',
    'marketplace_user',
  ]);
  if (!caller) {
    const signInUrl = new URL(paths.auth.jwt.signIn, request.url);
    signInUrl.searchParams.set('returnTo', `${url.pathname}${url.search}`);
    return NextResponse.redirect(signInUrl);
  }

  const result = await resolveEkruAppAccess(caller, { code: appCode });
  if (!result.allowed) {
    const forbiddenUrl = new URL(paths.page403, request.url);
    forbiddenUrl.searchParams.set('reason', result.reason);
    return NextResponse.redirect(forbiddenUrl);
  }

  const launchUrl = new URL(result.access.launchPath, request.url);
  launchUrl.searchParams.set('workspaceId', result.access.workspaceId);
  return NextResponse.redirect(launchUrl);
}
