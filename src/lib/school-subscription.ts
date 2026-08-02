import 'server-only';

import type { SchoolFeatureKey } from './school-subscription-config';

import { supabaseAdmin } from './supabase-admin';

// ----------------------------------------------------------------------

export async function loadSchoolSubscription(schoolId: string) {
  const { data } = await supabaseAdmin
    .from('school_subscriptions')
    .select(
      'id, school_id, plan_name, status, billing_cycle, price, currency, starts_at, ends_at, max_school_admins, max_teachers, max_students, enabled_features, notes, updated_at'
    )
    .eq('school_id', schoolId)
    .maybeSingle();
  return data;
}

export function isSubscriptionUsable(
  subscription: Awaited<ReturnType<typeof loadSchoolSubscription>>
) {
  if (!subscription || !['trialing', 'active'].includes(subscription.status)) return false;
  if (!subscription.ends_at) return true;
  return subscription.ends_at >= new Date().toISOString().slice(0, 10);
}

export type SchoolEntitlementContext = {
  userId?: string | null;
  role?: 'master_admin' | 'school_admin' | 'teacher' | 'student';
};

async function loadPersonalLicenses(userId: string | null | undefined, now: string) {
  if (!userId) return [];
  const { data: appUser } = await supabaseAdmin
    .from('app_users')
    .select('auth_user_id')
    .eq('id', userId)
    .maybeSingle();
  if (!appUser?.auth_user_id) return [];

  const { data: marketplaceUser } = await supabaseAdmin
    .from('marketplace_users')
    .select('id')
    .eq('auth_user_id', appUser.auth_user_id)
    .eq('is_active', true)
    .maybeSingle();
  if (!marketplaceUser) return [];

  const { data } = await supabaseAdmin
    .from('marketplace_user_licenses')
    .select('id, feature_keys, starts_at, expires_at, status, product_id')
    .eq('buyer_id', marketplaceUser.id)
    .eq('status', 'active')
    .lte('starts_at', now)
    .gt('expires_at', now);
  return data ?? [];
}

export async function loadEffectiveSchoolEntitlements(
  schoolId: string,
  context: SchoolEntitlementContext = {}
) {
  const now = new Date().toISOString();
  const [subscription, { data: workspace }, { data: licenses }, { data: purchases }, personalLicenses] =
    await Promise.all([
    loadSchoolSubscription(schoolId),
    supabaseAdmin
      .from('schools')
      .select('workspace_type')
      .eq('id', schoolId)
      .maybeSingle(),
    supabaseAdmin
      .from('marketplace_school_licenses')
      .select(
        'id, license_scope, feature_keys, seat_count, max_school_admins, max_teachers, max_students, starts_at, expires_at, status, product_id'
      )
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gt('expires_at', now),
    supabaseAdmin
      .from('school_feature_purchases')
      .select('feature_key, expires_at')
      .eq('school_id', schoolId)
      .gt('expires_at', now),
      context.role === 'teacher' ? loadPersonalLicenses(context.userId, now) : Promise.resolve([]),
    ]);

  const usesSchoolSubscription =
    workspace?.workspace_type !== 'personal' && isSubscriptionUsable(subscription);
  const activeLicenses = licenses ?? [];
  let assignedLicenseIds = new Set<string>();
  if (context.role === 'teacher' && context.userId && activeLicenses.length > 0) {
    const { data: assignments } = await supabaseAdmin
      .from('marketplace_teacher_license_assignments')
      .select('license_id')
      .eq('teacher_id', context.userId)
      .is('revoked_at', null)
      .in(
        'license_id',
        activeLicenses.map((license) => license.id)
      );
    assignedLicenseIds = new Set((assignments ?? []).map((assignment) => assignment.license_id));
  }

  const enabledFeatures = new Set<SchoolFeatureKey>();
  if (usesSchoolSubscription) {
    for (const feature of subscription?.enabled_features ?? []) {
      enabledFeatures.add(feature as SchoolFeatureKey);
    }
  }
  for (const purchase of purchases ?? []) {
    enabledFeatures.add(purchase.feature_key as SchoolFeatureKey);
  }
  const accessibleLicenses = activeLicenses.filter(
    (license) =>
      license.license_scope === 'school' ||
      context.role === 'school_admin' ||
      context.role === 'master_admin' ||
      (context.role === 'teacher' && assignedLicenseIds.has(license.id))
  );
  for (const license of accessibleLicenses) {
    for (const feature of license.feature_keys ?? []) {
      enabledFeatures.add(feature as SchoolFeatureKey);
    }
  }
  for (const license of personalLicenses) {
    for (const feature of license.feature_keys ?? []) {
      enabledFeatures.add(feature as SchoolFeatureKey);
    }
  }

  const expirations = [
    ...(usesSchoolSubscription && subscription?.ends_at
      ? [new Date(`${subscription.ends_at}T23:59:59.999Z`).getTime()]
      : []),
    ...accessibleLicenses.map((license) => new Date(license.expires_at).getTime()),
    ...personalLicenses.map((license) => new Date(license.expires_at).getTime()),
    ...(purchases ?? []).map((purchase) => new Date(purchase.expires_at).getTime()),
  ].filter(Number.isFinite);

  return {
    subscription,
    activeLicenses: accessibleLicenses,
    activePersonalLicenses: personalLicenses,
    activePurchases: purchases ?? [],
    enabledFeatures: [...enabledFeatures],
    usable:
      usesSchoolSubscription ||
      accessibleLicenses.length > 0 ||
      personalLicenses.length > 0 ||
      (purchases?.length ?? 0) > 0,
    accessEndsAt: expirations.length
      ? new Date(Math.max(...expirations)).toISOString()
      : null,
  };
}

export async function isSchoolAccessUsable(
  schoolId: string,
  context: SchoolEntitlementContext = {}
) {
  return (await loadEffectiveSchoolEntitlements(schoolId, context)).usable;
}

export async function schoolHasFeature(
  schoolId: string,
  feature: SchoolFeatureKey,
  context: SchoolEntitlementContext = {}
) {
  const entitlements = await loadEffectiveSchoolEntitlements(schoolId, context);
  return entitlements.usable && entitlements.enabledFeatures.includes(feature);
}

export async function checkSchoolSeatLimit(
  schoolId: string,
  role: 'school_admin' | 'teacher' | 'student'
) {
  const entitlements = await loadEffectiveSchoolEntitlements(schoolId);
  const { subscription, activeLicenses } = entitlements;
  if (!entitlements.usable) {
    return { allowed: false, message: 'แพ็กเกจโรงเรียนหมดอายุหรือถูกระงับ' };
  }

  const limitKey =
    role === 'school_admin'
      ? 'max_school_admins'
      : role === 'teacher'
        ? 'max_teachers'
        : 'max_students';
  const limits = [
    ...(isSubscriptionUsable(subscription) ? [subscription![limitKey]] : []),
    ...activeLicenses.map((license) => license[limitKey] ?? 0),
  ];
  const limit = limits.includes(0) ? 0 : limits.reduce((total, value) => total + value, 0);
  if (limit === 0) return { allowed: true, limit, count: 0 };

  const { count } = await supabaseAdmin
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('role', role)
    .eq('is_active', true);
  const activeCount = count ?? 0;
  return {
    allowed: activeCount < limit,
    limit,
    count: activeCount,
    message:
      activeCount >= limit
        ? `จำนวนบัญชี${role === 'teacher' ? 'ครู' : role === 'student' ? 'นักเรียน' : 'ผู้ดูแลโรงเรียน'}เต็มตามแพ็กเกจแล้ว (${activeCount}/${limit})`
        : undefined,
  };
}
