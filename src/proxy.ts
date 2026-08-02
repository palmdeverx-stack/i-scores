import type { AppRole, SessionRole } from 'src/lib/auth-token';

import { NextResponse, type NextRequest } from 'next/server';

import { paths } from 'src/routes/paths';

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
    ({ prefix }) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`)
  );
  const isExpiredPage = pathname === paths.licenseExpired;
  if (!area && !isApi && !isExpiredPage) return NextResponse.next();

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const caller = token ? verifyAppToken(token) : null;
  if (!caller) {
    if (isApi) return NextResponse.next();
    const signInUrl = new URL(paths.auth.jwt.signIn, request.url);
    signInUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(signInUrl);
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
          !requiredFeatures.some((feature) => entitlements.enabledFeatures.includes(feature as never))
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
