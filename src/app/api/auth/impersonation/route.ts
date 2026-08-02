import { NextResponse } from 'next/server';

import { paths } from 'src/routes/paths';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import {
  requireRole,
  signAppToken,
  getRequestToken,
  ACCESS_TOKEN_COOKIE,
  MASTER_SESSION_COOKIE,
  accessTokenCookieOptions,
  masterSessionCookieOptions,
} from 'src/lib/auth-token';

// ----------------------------------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREVIEW_ROLES = ['school_admin', 'teacher', 'student'] as const;

function redirectForRole(role: (typeof PREVIEW_ROLES)[number]) {
  if (role === 'school_admin') return paths.admin.root;
  if (role === 'teacher') return paths.teacher.root;
  return paths.student.root;
}

export async function GET(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  if (!caller) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const schoolId = new URL(request.url).searchParams.get('schoolId') ?? '';
  if (!UUID_PATTERN.test(schoolId)) {
    return NextResponse.json({ message: 'ข้อมูลโรงเรียนไม่ถูกต้อง' }, { status: 400 });
  }

  const [{ data: school }, ...targetResults] = await Promise.all([
    supabaseAdmin.from('schools').select('id, name, is_active').eq('id', schoolId).maybeSingle(),
    ...PREVIEW_ROLES.map((role) =>
      supabaseAdmin
        .from('app_users')
        .select('id, username, first_name, last_name, role')
        .eq('school_id', schoolId)
        .eq('role', role)
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
        .maybeSingle()
    ),
  ]);

  if (!school) {
    return NextResponse.json({ message: 'ไม่พบโรงเรียนนี้' }, { status: 404 });
  }

  return NextResponse.json({
    school,
    targets: targetResults.flatMap((result) => (result.data ? [result.data] : [])),
  });
}

export async function POST(request: Request) {
  const caller = requireRole(request, ['master_admin']);
  const masterToken = getRequestToken(request);
  if (!caller || !masterToken) {
    return NextResponse.json({ message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetUserId = typeof body?.targetUserId === 'string' ? body.targetUserId : '';
  if (!UUID_PATTERN.test(targetUserId)) {
    return NextResponse.json({ message: 'ข้อมูลบัญชีไม่ถูกต้อง' }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin
    .from('app_users')
    .select('id, username, role, school_id, is_active')
    .eq('id', targetUserId)
    .in('role', [...PREVIEW_ROLES])
    .maybeSingle();
  if (!target?.is_active || !target.school_id) {
    return NextResponse.json({ message: 'ไม่พบบัญชีที่พร้อมให้ดูในนาม' }, { status: 404 });
  }

  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('id, is_active')
    .eq('id', target.school_id)
    .maybeSingle();
  if (!school?.is_active) {
    return NextResponse.json({ message: 'โรงเรียนนี้ถูกปิดใช้งาน' }, { status: 403 });
  }

  const { data: audit, error: auditError } = await supabaseAdmin
    .from('auth_impersonation_audit')
    .insert({
      master_user_id: caller.sub,
      target_user_id: target.id,
      school_id: target.school_id,
    })
    .select('id')
    .single();
  if (auditError || !audit) {
    return NextResponse.json(
      { message: auditError?.message ?? 'ไม่สามารถเริ่มโหมดเข้าสู่ระบบในนามได้' },
      { status: 500 }
    );
  }

  const previewToken = signAppToken({
    sub: target.id,
    username: target.username,
    role: target.role,
    schoolId: target.school_id,
    authProvider: caller.authProvider ?? 'password',
    impersonatedBy: caller.sub,
    impersonationAuditId: audit.id,
    previewAllFeatures: true,
  });
  const response = NextResponse.json({
    redirectUrl: redirectForRole(target.role),
  });
  response.cookies.set(MASTER_SESSION_COOKIE, masterToken, masterSessionCookieOptions);
  response.cookies.set(ACCESS_TOKEN_COOKIE, previewToken, accessTokenCookieOptions);
  return response;
}
