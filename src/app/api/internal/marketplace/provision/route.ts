import { NextResponse } from 'next/server';

import { supabaseAdmin } from 'src/lib/supabase-admin';
import { isValidMarketplaceProvisionSecret } from 'src/lib/marketplace-internal-auth';

// ----------------------------------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  const buyerAuthUserId =
    typeof body?.buyerAuthUserId === 'string' ? body.buyerAuthUserId : '';
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

  const { data, error } = await supabaseAdmin.rpc('provision_marketplace_purchase', {
    p_order_item_id: orderItemId,
    p_buyer_auth_user_id: buyerAuthUserId,
    p_license_scope: licenseScope,
    p_plan_code: planCode,
    p_feature_keys: featureKeys,
    p_expires_at: expiresAtDate.toISOString(),
    p_school_id: schoolId,
    p_school_name: schoolName,
    p_school_code: schoolCode,
  });
  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: databaseErrorStatus(error.message) }
    );
  }

  return NextResponse.json(data, { status: data?.idempotentReplay ? 200 : 201 });
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
