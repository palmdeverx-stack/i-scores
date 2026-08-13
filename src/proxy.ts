import type { AppRole, SessionRole } from 'src/lib/auth-token';

import { NextResponse, type NextRequest } from 'next/server';

import { paths } from 'src/routes/paths';

import { getSessionStatus } from 'src/lib/session-security';
import { writeSecurityAudit } from 'src/lib/security-audit';
import { isCrossSiteMutation } from 'src/lib/request-security';
import { verifyAppToken, ACCESS_TOKEN_COOKIE } from 'src/lib/auth-token';
import { loadEffectiveSchoolEntitlements } from 'src/lib/school-subscription';

// ----------------------------------------------------------------------

const AREA_ROLES: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: '/master', roles: ['master_admin'] },
  { prefix: '/admin', roles: ['school_admin'] },
  { prefix: '/teacher', roles: ['teacher'] },
  { prefix: '/student', roles: ['student'] },
];

function homeForRole(role: SessionRole) {
  if (role === 'master_admin') return paths.master.root;
  if (role === 'school_admin') return paths.admin.root;
  if (role === 'teacher') return paths.teacher.root;
  if (role === 'student') return paths.student.root;
  return paths.page403;
}

const LICENSE_API_EXEMPT_PREFIXES = [
  '/api/auth/',
  '/api/internal/',
  '/api/guardian/',
  '/api/line/',
];

function isLicenseApiExempt(pathname: string) {
  return LICENSE_API_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function requiredApiFeatures(role: SessionRole, pathname: string): string[] {
  if (role === 'teacher') {
    if (pathname.startsWith('/api/teacher/attendance-scan/')) return ['teacher.qr_attendance'];
    if (pathname.startsWith('/api/teacher/timetable')) return ['teacher.timetable'];
    if (pathname.startsWith('/api/teacher/announcements')) return ['teacher.announcements'];
    if (/^\/api\/teacher-assignments\/[^/]+\/attendance(?:\/|$)/.test(pathname)) {
      return ['teacher.qr_attendance', 'teacher.assignments'];
    }
    if (/^\/api\/teacher-assignments\/[^/]+\/(?:assignments|score-report)(?:\/|$)/.test(pathname)) {
      return ['teacher.assignments'];
    }
  }
  if (role === 'student') {
    if (pathname.startsWith('/api/student/attendance')) return ['student.attendance'];
    if (pathname.startsWith('/api/student/qr')) return ['student.qr'];
    if (pathname.startsWith('/api/student/dashboard/assignments')) return ['student.assignments'];
    if (pathname.startsWith('/api/student/quizzes/')) return ['student.assignments'];
    if (
      pathname.startsWith('/api/student/dashboard/subjects') ||
      pathname.startsWith('/api/student/dashboard/classroom')
    ) {
      return ['student.subjects'];
    }
  }
  return [];
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');
  const area = AREA_ROLES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isExpiredPage = pathname === paths.licenseExpired;
  if (!area && !isApi && !isExpiredPage) return NextResponse.next();

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const caller = token ? verifyAppToken(token) : null;
  if (isCrossSiteMutation(request)) {
    await writeSecurityAudit({
      action: 'request.cross_site_blocked',
      actorUserId: caller?.sub,
      schoolId: caller?.schoolId,
      request,
      metadata: { method: request.method, pathname },
    });
    return NextResponse.json({ message: 'Cross-site request blocked' }, { status: 403 });
  }

  if (!caller) {
    if (isApi) return NextResponse.next();
    const signInUrl = new URL(paths.auth.jwt.signIn, request.url);
    signInUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const sessionStatus = await getSessionStatus(caller);

  if (sessionStatus === 'error') {
    // The liveness check itself failed (DB timeout/unreachable) — this is not proof the
    // session is invalid, so never redirect to sign-in or delete the cookie for it. Fail
    // closed (block the request) rather than silently treating the caller as logged out.
    await writeSecurityAudit({
      action: 'session.check_failed',
      actorUserId: caller.sub,
      schoolId: caller.schoolId,
      request,
      metadata: { role: caller.role, pathname },
    });
    return NextResponse.json(
      { code: 'SESSION_CHECK_FAILED', message: 'ไม่สามารถตรวจสอบสถานะบัญชีได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 503 }
    );
  }

  if (sessionStatus === 'inactive') {
    await writeSecurityAudit({
      action: 'session.rejected',
      actorUserId: caller.sub,
      schoolId: caller.schoolId,
      request,
      metadata: { role: caller.role, pathname },
    });
    const response = isApi
      ? NextResponse.json(
          {
            code: 'SESSION_REJECTED',
            message: 'Session ถูกยกเลิกหรือบัญชีถูกปิดใช้งาน',
          },
          { status: 401 }
        )
      : NextResponse.redirect(new URL(paths.auth.jwt.signIn, request.url));
    // Never let a stale API response delete a newer cookie issued by a concurrent
    // sign-in/PIN request. Page navigations can safely clear the rejected cookie.
    if (!isApi) response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }

  if (area && !area.roles.includes(caller.role as AppRole)) {
    return NextResponse.redirect(new URL(homeForRole(caller.role), request.url));
  }

  const schoolRole = ['school_admin', 'teacher', 'student'].includes(caller.role);
  if (
    schoolRole &&
    caller.schoolId &&
    !caller.previewAllFeatures &&
    !(isApi && isLicenseApiExempt(pathname))
  ) {
    const entitlements = await loadEffectiveSchoolEntitlements(caller.schoolId, {
      userId: caller.sub,
      role: caller.role as AppRole,
    });
    if (!entitlements.usable) {
      if (isApi) {
        return NextResponse.json(
          {
            message: 'License หมดอายุหรือไม่พร้อมใช้งาน',
            code: 'LICENSE_EXPIRED',
            renewUrl: process.env.NEXT_PUBLIC_MARKETPLACE_URL || null,
          },
          { status: 403 }
        );
      }
      if (!isExpiredPage) {
        return NextResponse.redirect(new URL(paths.licenseExpired, request.url));
      }
    } else {
      if (isExpiredPage) {
        return NextResponse.redirect(new URL(homeForRole(caller.role), request.url));
      }
      if (isApi) {
        const requiredFeatures = requiredApiFeatures(caller.role, pathname);
        if (
          requiredFeatures.length > 0 &&
          !requiredFeatures.some((feature) =>
            entitlements.enabledFeatures.includes(feature as never)
          )
        ) {
          return NextResponse.json(
            { message: 'License ไม่รองรับความสามารถนี้', code: 'FEATURE_NOT_INCLUDED' },
            { status: 403 }
          );
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/master/:path*',
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/license-expired',
    '/api/:path*',
  ],
};
