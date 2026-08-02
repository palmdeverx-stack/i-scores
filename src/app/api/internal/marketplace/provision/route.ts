import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { isValidMarketplaceProvisionSecret } from 'src/lib/marketplace-internal-auth';
import {
  ensurePersonalWorkspace,
  finalizePersonalWorkspace,
  hasPersonalWorkspaceFeatures,
} from 'src/lib/personal-workspace-provisioning';

// ----------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APP_CODE_PATTERN = /^[A-Z0-9_]+(?:_[A-Z0-9_]+)*$/;
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
    hasPersonalWorkspaceFeatures(featureKeys);
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
