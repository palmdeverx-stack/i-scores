import 'server-only';

import type { AppTokenPayload } from './auth-token';

import { supabaseAdmin } from './supabase-admin';

// ----------------------------------------------------------------------

export type EkruAppAccess = {
  appId: string;
  appCode: string;
  appName: string;
  launchPath: string;
  requiredFeatureKey: string;
  workspaceId: string;
  scope: 'individual' | 'school';
  schoolId: string | null;
};

type AccessResult =
  | { allowed: true; access: EkruAppAccess }
  | { allowed: false; reason: string };

async function findOrCreateWorkspace(params: {
  appId: string;
  authUserId: string;
  schoolId: string | null;
  scope: 'individual' | 'school';
}) {
  const isIndividual = params.scope === 'individual';
  let query = supabaseAdmin
    .from('ekru_app_workspaces')
    .select('id, status')
    .eq('app_id', params.appId);
  query = isIndividual
    ? query.eq('owner_auth_user_id', params.authUserId).is('school_id', null)
    : query.eq('school_id', params.schoolId).is('owner_auth_user_id', null);

  const { data: existing } = await query.maybeSingle();
  if (existing) {
    if (existing.status !== 'active') {
      const { data } = await supabaseAdmin
        .from('ekru_app_workspaces')
        .update({ status: 'active' })
        .eq('id', existing.id)
        .select('id')
        .single();
      return data?.id ?? existing.id;
    }
    return existing.id;
  }

  const { data: created, error } = await supabaseAdmin
    .from('ekru_app_workspaces')
    .insert({
      app_id: params.appId,
      owner_auth_user_id: isIndividual ? params.authUserId : null,
      school_id: isIndividual ? null : params.schoolId,
    })
    .select('id')
    .single();
  if (!error && created) return created.id;

  let retryQuery = supabaseAdmin
    .from('ekru_app_workspaces')
    .select('id')
    .eq('app_id', params.appId);
  retryQuery = isIndividual
    ? retryQuery.eq('owner_auth_user_id', params.authUserId)
    : retryQuery.eq('school_id', params.schoolId);
  const { data: racedWorkspace } = await retryQuery.maybeSingle();
  return racedWorkspace?.id ?? null;
}

export async function resolveEkruAppAccess(
  caller: AppTokenPayload,
  identifier: { code?: string; launchPath?: string }
): Promise<AccessResult> {
  const appQuery = supabaseAdmin
    .from('ekru_apps')
    .select('id, code, name, launch_path, required_feature_key, supported_scope')
    .eq('is_active', true);
  const { data: app } = identifier.code
    ? await appQuery.eq('code', identifier.code.toUpperCase()).maybeSingle()
    : await appQuery.eq('launch_path', identifier.launchPath).maybeSingle();
  if (!app) return { allowed: false, reason: 'ไม่พบระบบย่อยหรือระบบถูกปิดใช้งาน' };

  const { data: appUser } = await supabaseAdmin
    .from('app_users')
    .select('id, auth_user_id, school_id, role, is_active')
    .eq('id', caller.sub)
    .maybeSingle();
  if (!appUser?.is_active || !appUser.auth_user_id) {
    return { allowed: false, reason: 'บัญชีนี้ยังไม่เชื่อมกับ Supabase Auth' };
  }

  const { data: marketplaceUser } = await supabaseAdmin
    .from('marketplace_users')
    .select('id, is_active')
    .eq('auth_user_id', appUser.auth_user_id)
    .maybeSingle();
  if (!marketplaceUser?.is_active) {
    return { allowed: false, reason: 'ไม่พบบัญชี Marketplace ที่ใช้งานอยู่' };
  }

  const now = new Date().toISOString();
  if (app.supported_scope !== 'school') {
    const { data: personalLicense } = await supabaseAdmin
      .from('marketplace_user_licenses')
      .select('id')
      .eq('buyer_id', marketplaceUser.id)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gt('expires_at', now)
      .contains('feature_keys', [app.required_feature_key])
      .limit(1)
      .maybeSingle();
    if (personalLicense) {
      const workspaceId = await findOrCreateWorkspace({
        appId: app.id,
        authUserId: appUser.auth_user_id,
        schoolId: null,
        scope: 'individual',
      });
      if (!workspaceId) return { allowed: false, reason: 'ไม่สามารถเปิด Workspace ได้' };
      return {
        allowed: true,
        access: {
          appId: app.id,
          appCode: app.code,
          appName: app.name,
          launchPath: app.launch_path,
          requiredFeatureKey: app.required_feature_key,
          workspaceId,
          scope: 'individual',
          schoolId: null,
        },
      };
    }
  }

  if (!appUser.school_id || app.supported_scope === 'individual') {
    return { allowed: false, reason: 'ไม่พบ License ที่ใช้งานได้สำหรับระบบนี้' };
  }

  const { data: membership } = await supabaseAdmin
    .from('marketplace_school_members')
    .select('id')
    .eq('school_id', appUser.school_id)
    .eq('marketplace_user_id', marketplaceUser.id)
    .maybeSingle();
  if (!membership) {
    return { allowed: false, reason: 'บัญชีนี้ไม่ได้เป็นสมาชิก Marketplace ของโรงเรียน' };
  }

  const { data: schoolLicenses } = await supabaseAdmin
    .from('marketplace_school_licenses')
    .select('id, license_scope')
    .eq('school_id', appUser.school_id)
    .eq('status', 'active')
    .lte('starts_at', now)
    .gt('expires_at', now)
    .contains('feature_keys', [app.required_feature_key]);

  let validSchoolLicense = (schoolLicenses ?? []).find(
    (license) => license.license_scope === 'school'
  );
  if (!validSchoolLicense) {
    const teacherLicenseIds = (schoolLicenses ?? [])
      .filter((license) => license.license_scope === 'teacher')
      .map((license) => license.id);
    if (teacherLicenseIds.length > 0) {
      const { data: assignment } = await supabaseAdmin
        .from('marketplace_teacher_license_assignments')
        .select('license_id')
        .eq('teacher_id', appUser.id)
        .is('revoked_at', null)
        .in('license_id', teacherLicenseIds)
        .limit(1)
        .maybeSingle();
      validSchoolLicense = (schoolLicenses ?? []).find(
        (license) => license.id === assignment?.license_id
      );
    }
  }
  if (!validSchoolLicense) {
    return { allowed: false, reason: 'ไม่มี License โรงเรียนหรือที่นั่งครูสำหรับระบบนี้' };
  }

  const workspaceId = await findOrCreateWorkspace({
    appId: app.id,
    authUserId: appUser.auth_user_id,
    schoolId: appUser.school_id,
    scope: 'school',
  });
  if (!workspaceId) return { allowed: false, reason: 'ไม่สามารถเปิด Workspace ได้' };

  return {
    allowed: true,
    access: {
      appId: app.id,
      appCode: app.code,
      appName: app.name,
      launchPath: app.launch_path,
      requiredFeatureKey: app.required_feature_key,
      workspaceId,
      scope: 'school',
      schoolId: appUser.school_id,
    },
  };
}
