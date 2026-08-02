import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { isSchoolAccessUsable } from 'src/lib/school-subscription';
import { syncLinkedStaffAuth, defaultStaffAuthRole } from 'src/lib/staff-supabase-auth';
import { recoverPersonalWorkspacePurchases } from 'src/lib/personal-workspace-provisioning';
import {
  signAppToken,
  toPublicUser,
  signPinChallenge,
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from 'src/lib/auth-token';

// ----------------------------------------------------------------------

function googleProfile(authUser: {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  identities?: { provider: string }[];
}) {
  const providers = authUser.identities?.map((identity) => identity.provider) ?? [];
  const isGoogle =
    authUser.app_metadata.provider === 'google' ||
    providers.includes('google');
  const emailVerified =
    authUser.user_metadata.email_verified === true || isGoogle;

  return {
    isGoogle,
    emailVerified,
    email: authUser.email?.trim().toLowerCase() ?? '',
    username:
      typeof authUser.user_metadata.username === 'string'
        ? authUser.user_metadata.username.trim()
        : '',
    firstName:
      typeof authUser.user_metadata.first_name === 'string'
        ? authUser.user_metadata.first_name.trim()
        : '',
    lastName:
      typeof authUser.user_metadata.last_name === 'string'
        ? authUser.user_metadata.last_name.trim()
        : '',
  };
}

async function ensureMarketplaceProfile(
  authUser: Parameters<typeof googleProfile>[0],
  profile: ReturnType<typeof googleProfile>
) {
  const { data: byAuthId } = await supabaseAdmin
    .from('marketplace_users')
    .select('id, auth_user_id, email')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (byAuthId) return byAuthId;

  const { data: byEmail } = await supabaseAdmin
    .from('marketplace_users')
    .select('id, auth_user_id, email')
    .ilike('email', profile.email)
    .maybeSingle();
  if (byEmail) {
    if (byEmail.auth_user_id !== authUser.id) {
      const { data: previousAuth } = await supabaseAdmin.auth.admin.getUserById(
        byEmail.auth_user_id
      );
      if (previousAuth.user) {
        throw new Error('อีเมลนี้เชื่อมกับบัญชี Marketplace อื่นอยู่แล้ว');
      }

      const { data: recoveredProfile, error: recoverError } = await supabaseAdmin
        .from('marketplace_users')
        .update({ auth_user_id: authUser.id })
        .eq('id', byEmail.id)
        .eq('auth_user_id', byEmail.auth_user_id)
        .select('id, auth_user_id, email')
        .maybeSingle();
      if (recoverError || !recoveredProfile) {
        throw new Error(
          recoverError?.message ?? 'ไม่สามารถกู้คืนการเชื่อมบัญชี Marketplace ได้'
        );
      }
      return recoveredProfile;
    }
    return byEmail;
  }

  const usernamePrefix =
    profile.username ||
    profile.email.split('@')[0].replaceAll(/[^a-zA-Z0-9._-]/g, '') ||
    'google';
  const username = `${usernamePrefix}_${authUser.id.slice(0, 8)}`;
  const { data, error } = await supabaseAdmin
    .from('marketplace_users')
    .insert({
      auth_user_id: authUser.id,
      username,
      email: profile.email,
      first_name: profile.firstName || null,
      last_name: profile.lastName || null,
      role: 'marketplace_user',
      is_active: true,
    })
    .select('id, auth_user_id, email')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'ไม่สามารถสร้างโปรไฟล์ Marketplace ได้');
  }
  return data;
}

async function marketplaceLandingPath(marketplaceUserId: string) {
  const now = new Date().toISOString();
  const { data: licenses } = await supabaseAdmin
    .from('marketplace_user_licenses')
    .select('feature_keys')
    .eq('buyer_id', marketplaceUserId)
    .eq('status', 'active')
    .lte('starts_at', now)
    .gt('expires_at', now);
  const featureKeys = [
    ...new Set((licenses ?? []).flatMap((license) => license.feature_keys ?? [])),
  ];

  if (featureKeys.length > 0) {
    const { data: app } = await supabaseAdmin
      .from('ekru_apps')
      .select('code')
      .eq('is_active', true)
      .in('supported_scope', ['individual', 'both'])
      .in('required_feature_key', featureKeys)
      .order('code')
      .limit(1)
      .maybeSingle();
    if (app) return `/launch?app=${encodeURIComponent(app.code)}`;
  }

  return null;
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? '';
  if (!accessToken) {
    console.error('[auth/google] Missing bearer token', {
      hasAuthorizationHeader: Boolean(authorization),
      authorizationScheme: authorization.split(/\s+/, 1)[0] || null,
    });
    return NextResponse.json(
      {
        code: 'SUPABASE_TOKEN_MISSING',
        message: 'ไม่พบ Supabase access token',
      },
      { status: 401 }
    );
  }

  const { data, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  const authUser = data.user;
  if (authError || !authUser) {
    console.error('[auth/google] Supabase token validation failed', {
      status: authError?.status ?? null,
      code: authError?.code ?? null,
      message: authError?.message ?? 'User missing from Supabase response',
      tokenLength: accessToken.length,
      tokenSegments: accessToken.split('.').length,
    });
    return NextResponse.json(
      {
        code: 'SUPABASE_TOKEN_INVALID',
        message:
          process.env.NODE_ENV === 'development' && authError?.message
            ? `Google session ไม่ถูกต้อง: ${authError.message}`
            : 'Google session ไม่ถูกต้องหรือหมดอายุ',
      },
      { status: 401 }
    );
  }

  const profile = googleProfile(authUser);
  if (!profile.isGoogle || !profile.emailVerified || !profile.email) {
    return NextResponse.json(
      { message: 'บัญชีนี้ไม่ใช่อีเมลที่ Google ยืนยันแล้ว' },
      { status: 403 }
    );
  }

  let marketplaceProfile;
  try {
    marketplaceProfile = await ensureMarketplaceProfile(authUser, profile);
  } catch (profileError) {
    return NextResponse.json(
      {
        message:
          profileError instanceof Error
            ? profileError.message
            : 'ไม่สามารถตรวจสอบบัญชี Marketplace ได้',
      },
      { status: 409 }
    );
  }

  try {
    await recoverPersonalWorkspacePurchases(authUser.id);
  } catch (recoveryError) {
    console.error('[auth/google] Personal workspace recovery failed', {
      authUserId: authUser.id,
      message: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
    });
    return NextResponse.json(
      {
        code: 'PERSONAL_WORKSPACE_PROVISION_FAILED',
        message:
          recoveryError instanceof Error
            ? recoveryError.message
            : 'ไม่สามารถสร้างพื้นที่ส่วนตัวจาก License ได้',
      },
      { status: 409 }
    );
  }

  const { data: linkedUsers } = await supabaseAdmin
    .from('app_users')
    .select('*, school:schools!app_users_school_id_fkey(workspace_type, owner_auth_user_id)')
    .eq('auth_user_id', authUser.id)
    .eq('is_active', true);

  const linkedUser = (linkedUsers ?? []).find((candidate) => {
    const school = Array.isArray(candidate.school) ? candidate.school[0] : candidate.school;
    return school?.workspace_type === 'personal' && school.owner_auth_user_id === authUser.id;
  }) ?? linkedUsers?.[0];

  let appUser = linkedUser;
  if (!appUser) {
    const { data: emailUser } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .ilike('email', profile.email)
      .neq('role', 'student')
      .maybeSingle();

    if (emailUser?.auth_user_id && emailUser.auth_user_id !== authUser.id) {
      return NextResponse.json(
        { message: 'อีเมลนี้เชื่อมกับบัญชีเข้าสู่ระบบอื่นอยู่แล้ว กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 409 }
      );
    }

    if (emailUser) {
      const authRole = emailUser.auth_role ?? defaultStaffAuthRole(emailUser.role);
      const { data: connectedUser, error: connectError } = await supabaseAdmin
        .from('app_users')
        .update({
          auth_user_id: authUser.id,
          auth_login_email: profile.email,
          auth_role: authRole,
          auth_migrated_at: new Date().toISOString(),
          password_ciphertext: null,
        })
        .eq('id', emailUser.id)
        .is('auth_user_id', null)
        .select('*')
        .single();

      if (connectError || !connectedUser) {
        return NextResponse.json(
          { message: connectError?.message ?? 'ไม่สามารถเชื่อมบัญชี Google ได้' },
          { status: 409 }
        );
      }
      appUser = connectedUser;
    }
  }

  if (!appUser) {
    const redirectUrl = await marketplaceLandingPath(marketplaceProfile.id);
    if (!redirectUrl) {
      return NextResponse.json(
        { message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const accessAppToken = signAppToken({
      sub: marketplaceProfile.id,
      username: profile.username || profile.email,
      role: 'marketplace_user',
      schoolId: null,
      authProvider: 'google',
    });
    const response = NextResponse.json({
      marketplaceOnly: true,
      redirectUrl,
      user: {
        id: marketplaceProfile.id,
        username: profile.username || profile.email,
        email: profile.email,
        first_name: profile.firstName || null,
        last_name: profile.lastName || null,
        role: 'marketplace_user',
        school_id: null,
      },
    });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessAppToken, accessTokenCookieOptions);
    return response;
  }
  if (appUser.role === 'student') {
    return NextResponse.json(
      { message: 'บัญชีนักเรียนไม่รองรับการเข้าสู่ระบบด้วย Google' },
      { status: 403 }
    );
  }
  if (appUser.is_active === false) {
    return NextResponse.json(
      { message: 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลโรงเรียน' },
      { status: 403 }
    );
  }

  if (appUser.role !== 'master_admin') {
    const [{ data: school }, schoolAccessUsable] = await Promise.all([
      supabaseAdmin
        .from('schools')
        .select('is_active')
        .eq('id', appUser.school_id)
        .maybeSingle(),
      isSchoolAccessUsable(appUser.school_id, {
        userId: appUser.id,
        role: appUser.role,
      }),
    ]);
    if (!school?.is_active || !schoolAccessUsable) {
      return NextResponse.json(
        { message: 'โรงเรียนหรือแพ็กเกจยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }
  }

  const authSync = await syncLinkedStaffAuth(appUser, { isActive: true });
  if (!authSync.ok) {
    return NextResponse.json(
      { message: `ไม่สามารถอัปเดตบัญชีกลางได้: ${authSync.message}` },
      { status: 500 }
    );
  }

  if (appUser.role === 'master_admin' || appUser.role === 'school_admin') {
    const response = NextResponse.json({
      requiresPin: true,
      pinChallengeToken: signPinChallenge(appUser.id, 'google'),
      role: appUser.role,
    });
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }

  const accessAppToken = signAppToken({
    sub: appUser.id,
    username: appUser.username,
    role: appUser.role,
    schoolId: appUser.school_id,
    authProvider: 'google',
  });
  const response = NextResponse.json({ user: toPublicUser(appUser) });
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessAppToken, accessTokenCookieOptions);
  return response;
}
