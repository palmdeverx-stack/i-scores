import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { ALL_SCHOOL_FEATURE_KEYS } from 'src/lib/school-subscription-config';
import { isValidMarketplaceProvisionSecret } from 'src/lib/marketplace-internal-auth';

// ----------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APP_CODE_PATTERN = /^[A-Z0-9_]+(?:_[A-Z0-9_]+)*$/;
const PERSONAL_WORKSPACE_FEATURES = new Set<string>(ALL_SCHOOL_FEATURE_KEYS);

function personalWorkspaceCode(authUserId: string, attempt: number) {
  const hex = authUserId.replaceAll('-', '').slice(0, 12);
  const value = (Number.parseInt(hex, 16) + attempt) % 100_000_000;
  return value.toString().padStart(8, '0');
}

async function ensurePersonalWorkspace(
  authUserId: string
): Promise<{ id: string; workspaceType: 'school' | 'personal' }> {
  const { data: linkedAppUser } = await supabaseAdmin
    .from('app_users')
    .select('role, school_id, school:schools(workspace_type)')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (linkedAppUser?.school_id) {
    const linkedSchool = Array.isArray(linkedAppUser.school)
      ? linkedAppUser.school[0]
      : linkedAppUser.school;
    if (linkedSchool?.workspace_type !== 'personal') {
      throw new Error(
        'Individual workspace packages require a separate Marketplace account that is not linked to a school'
      );
    }
    if (!['school_admin', 'teacher'].includes(linkedAppUser.role)) {
      throw new Error('The existing personal workspace owner has an unsupported role');
    }
    return {
      id: linkedAppUser.school_id,
      workspaceType: 'personal',
    };
  }

  const { data: existing } = await supabaseAdmin
    .from('schools')
    .select('id')
    .eq('workspace_type', 'personal')
    .eq('owner_auth_user_id', authUserId)
    .maybeSingle();
  if (existing) return { id: existing.id, workspaceType: 'personal' as const };

  const { data: buyer } = await supabaseAdmin
    .from('marketplace_users')
    .select('email, first_name, last_name')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (!buyer) throw new Error('Active Marketplace buyer was not found');

  const displayName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ').trim();
  let lastError = 'Unable to create a personal workspace';

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: created, error } = await supabaseAdmin
      .from('schools')
      .insert({
        name: `พื้นที่ส่วนตัวของ ${displayName || buyer.email}`,
        code: personalWorkspaceCode(authUserId, attempt),
        email: buyer.email,
        workspace_type: 'personal',
        owner_auth_user_id: authUserId,
      })
      .select('id')
      .maybeSingle();
    if (created) {
      await supabaseAdmin
        .from('school_subscriptions')
        .update({ status: 'canceled', enabled_features: [] })
        .eq('school_id', created.id);
      return { id: created.id, workspaceType: 'personal' as const };
    }

    lastError = error?.message ?? lastError;
    const { data: racedWorkspace } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('workspace_type', 'personal')
      .eq('owner_auth_user_id', authUserId)
      .maybeSingle();
    if (racedWorkspace) return { id: racedWorkspace.id, workspaceType: 'personal' as const };
  }

  throw new Error(lastError);
}

async function finalizePersonalWorkspace(
  authUserId: string,
  schoolId: string,
  options: { seedAttendance: boolean }
) {
  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from('app_users')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (appUserError || !appUser) {
    throw new Error(appUserError?.message ?? 'Personal workspace owner was not provisioned');
  }

  if (appUser.role !== 'teacher') {
    const { error } = await supabaseAdmin
      .from('app_users')
      .update({ role: 'teacher', auth_role: 'teacher' })
      .eq('id', appUser.id);
    if (error) throw new Error(error.message);
  }

  if (appUser) {
    await supabaseAdmin
      .from('schools')
      .update({ created_by: appUser.id })
      .eq('id', schoolId)
      .is('created_by', null);
  }

  const currentYear = String(new Date().getUTCFullYear() + 543);
  const { data: academicYear, error: academicYearError } = await supabaseAdmin
    .from('academic_years')
    .upsert({ school_id: schoolId, year: currentYear }, { onConflict: 'school_id,year' })
    .select('id')
    .single();
  if (academicYearError || !academicYear) {
    throw new Error(academicYearError?.message ?? 'Unable to create personal academic year');
  }

  const { data: semester, error: semesterError } = await supabaseAdmin
    .from('semesters')
    .upsert(
      { academic_year_id: academicYear.id, name: 'ทั่วไป' },
      { onConflict: 'academic_year_id,name' }
    )
    .select('id')
    .single();
  if (semesterError || !semester) {
    throw new Error(semesterError?.message ?? 'Unable to create personal semester');
  }

  if (options.seedAttendance) {
    const { error: subjectError } = await supabaseAdmin.from('subjects').upsert(
      {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        semester_id: semester.id,
        code: 'ATTENDANCE',
        name: 'เช็กชื่อทั่วไป',
        credits: 0,
        study_hours: 0,
        status: 'published',
        created_by: appUser.id,
      },
      { onConflict: 'school_id,name', ignoreDuplicates: true }
    );
    if (subjectError) throw new Error(subjectError.message);
  }
}

function databaseErrorStatus(message: string) {
  if (/Idempotency|already has|already linked|already used/i.test(message)) return 409;
  if (/not found|does not belong/i.test(message)) return 404;
  return 400;
}

export async function POST(request: Request) {
  if (!isValidMarketplaceProvisionSecret(request)) {
    return NextResponse.json({ message: 'Invalid Marketplace provision secret' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderItemId = typeof body?.orderItemId === 'string' ? body.orderItemId : '';
  const buyerAuthUserId = typeof body?.buyerAuthUserId === 'string' ? body.buyerAuthUserId : '';
  const licenseScope = body?.licenseScope;
  const planCode = typeof body?.planCode === 'string' ? body.planCode.trim().toUpperCase() : '';
  const rawFeatureKeys: unknown[] = Array.isArray(body?.featureKeys) ? body.featureKeys : [];
  const featureKeys = [
    ...new Set<string>(
      rawFeatureKeys
        .map((value) => (typeof value === 'string' ? value.trim() : null))
        .filter((value): value is string => Boolean(value))
    ),
  ];
  const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : '';
  const expiresAtDate = new Date(expiresAt);
  const schoolId = typeof body?.school?.id === 'string' ? body.school.id : null;
  const schoolName = typeof body?.school?.name === 'string' ? body.school.name.trim() : null;
  const schoolCode = typeof body?.school?.code === 'string' ? body.school.code.trim() : null;

  if (
    !UUID_PATTERN.test(orderItemId) ||
    !UUID_PATTERN.test(buyerAuthUserId) ||
    !['individual', 'school'].includes(licenseScope) ||
    !APP_CODE_PATTERN.test(planCode) ||
    featureKeys.length === 0 ||
    featureKeys.some((feature) => feature.length > 120) ||
    Number.isNaN(expiresAtDate.getTime()) ||
    expiresAtDate <= new Date() ||
    (schoolId && !UUID_PATTERN.test(schoolId)) ||
    (schoolCode && !/^\d{8}$/.test(schoolCode))
  ) {
    return NextResponse.json({ message: 'Invalid provision payload' }, { status: 400 });
  }

  const { data: subscriptionPlan, error: subscriptionPlanError } = await supabaseAdmin
    .from('subscription_plans')
    .select('target_scope')
    .ilike('code', planCode)
    .maybeSingle();
  if (subscriptionPlanError) {
    return NextResponse.json({ message: subscriptionPlanError.message }, { status: 500 });
  }
  if (
    subscriptionPlan &&
    subscriptionPlan.target_scope !== 'both' &&
    subscriptionPlan.target_scope !== licenseScope
  ) {
    return NextResponse.json(
      { message: `Package ${planCode} does not support ${licenseScope} purchases` },
      { status: 400 }
    );
  }

  const isPersonalWorkspace =
    licenseScope === 'individual' &&
    featureKeys.some((feature) => PERSONAL_WORKSPACE_FEATURES.has(feature));
  const isPersonalAttendance =
    licenseScope === 'individual' && featureKeys.includes('teacher.qr_attendance');
  let effectiveSchoolId = schoolId;
  let effectiveWorkspaceType: 'school' | 'personal' = 'school';
  if (isPersonalWorkspace) {
    try {
      const workspace = await ensurePersonalWorkspace(buyerAuthUserId);
      effectiveSchoolId = workspace.id;
      effectiveWorkspaceType = workspace.workspaceType;
    } catch (workspaceError) {
      return NextResponse.json(
        {
          message:
            workspaceError instanceof Error
              ? workspaceError.message
              : 'Unable to create a personal workspace',
        },
        { status: 400 }
      );
    }
  }

  const provisionFunction = isPersonalWorkspace
    ? 'provision_personal_workspace_purchase'
    : 'provision_marketplace_purchase';
  const provisionPayload = {
    p_order_item_id: orderItemId,
    p_buyer_auth_user_id: buyerAuthUserId,
    p_plan_code: planCode,
    p_feature_keys: featureKeys,
    p_expires_at: expiresAtDate.toISOString(),
    p_school_id: effectiveSchoolId,
    ...(!isPersonalWorkspace && {
      p_license_scope: licenseScope,
      p_school_name: schoolName,
      p_school_code: schoolCode,
    }),
  };
  const { data, error } = await supabaseAdmin.rpc(provisionFunction, provisionPayload);
  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: databaseErrorStatus(error.message) }
    );
  }

  if (isPersonalWorkspace && effectiveSchoolId) {
    try {
      await finalizePersonalWorkspace(buyerAuthUserId, effectiveSchoolId, {
        seedAttendance: isPersonalAttendance,
      });
    } catch (finalizeError) {
      return NextResponse.json(
        {
          message:
            finalizeError instanceof Error
              ? finalizeError.message
              : 'Unable to finalize personal workspace',
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      ...data,
      ...(isPersonalWorkspace && {
        workspaceType: effectiveWorkspaceType,
        purchaseScope: 'individual',
      }),
    },
    { status: data?.idempotentReplay ? 200 : 201 }
  );
}

export async function PATCH(request: Request) {
  if (!isValidMarketplaceProvisionSecret(request)) {
    return NextResponse.json({ message: 'Invalid Marketplace provision secret' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderItemId = typeof body?.orderItemId === 'string' ? body.orderItemId : '';
  const status = body?.status;
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
  const graceUntil =
    typeof body?.graceUntil === 'string' && !Number.isNaN(new Date(body.graceUntil).getTime())
      ? new Date(body.graceUntil).toISOString()
      : null;

  if (!UUID_PATTERN.test(orderItemId) || !['expired', 'revoked', 'refunded'].includes(status)) {
    return NextResponse.json({ message: 'Invalid license status payload' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc('update_marketplace_provision_status', {
    p_order_item_id: orderItemId,
    p_status: status,
    p_reason: reason,
    p_grace_until: graceUntil,
  });
  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: databaseErrorStatus(error.message) }
    );
  }

  return NextResponse.json(data);
}
