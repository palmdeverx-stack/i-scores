import 'server-only';

import { supabaseAdmin } from './supabase-admin';
import { ALL_SCHOOL_FEATURE_KEYS } from './school-subscription-config';

// ----------------------------------------------------------------------

const PERSONAL_WORKSPACE_FEATURES = new Set<string>(ALL_SCHOOL_FEATURE_KEYS);

type PersonalWorkspace = { id: string; workspaceType: 'personal' };

type RecoverableLicense = {
  order_item_id: string;
  product_id: string;
  feature_keys: string[];
  expires_at: string;
  grants_plan_code: string | null;
};

function personalWorkspaceCode(authUserId: string, attempt: number) {
  const hex = authUserId.replaceAll('-', '').slice(0, 12);
  const value = (Number.parseInt(hex, 16) + attempt) % 100_000_000;
  return value.toString().padStart(8, '0');
}

function sameFeatures(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((feature) => expected.has(feature));
}

export function hasPersonalWorkspaceFeatures(featureKeys: string[]) {
  return featureKeys.some((feature) => PERSONAL_WORKSPACE_FEATURES.has(feature));
}

export async function ensurePersonalWorkspace(authUserId: string): Promise<PersonalWorkspace> {
  const { data: existing } = await supabaseAdmin
    .from('schools')
    .select('id')
    .eq('workspace_type', 'personal')
    .eq('owner_auth_user_id', authUserId)
    .maybeSingle();
  if (existing) {
    const { data: linkedAppUser } = await supabaseAdmin
      .from('app_users')
      .select('role, school_id')
      .eq('auth_user_id', authUserId)
      .eq('school_id', existing.id)
      .maybeSingle();
    if (!linkedAppUser) return { id: existing.id, workspaceType: 'personal' };
    if (!['school_admin', 'teacher'].includes(linkedAppUser.role)) {
      throw new Error('The existing personal workspace owner has an unsupported role');
    }
    return { id: existing.id, workspaceType: 'personal' };
  }

  const { data: buyer } = await supabaseAdmin
    .from('marketplace_users')
    .select('email, first_name, last_name')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
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
      return { id: created.id, workspaceType: 'personal' };
    }

    lastError = error?.message ?? lastError;
    const { data: racedWorkspace } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('workspace_type', 'personal')
      .eq('owner_auth_user_id', authUserId)
      .maybeSingle();
    if (racedWorkspace) return { id: racedWorkspace.id, workspaceType: 'personal' };
  }

  throw new Error(lastError);
}

export async function finalizePersonalWorkspace(
  authUserId: string,
  schoolId: string,
  options: { seedAttendance: boolean }
) {
  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from('app_users')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .eq('school_id', schoolId)
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

  await supabaseAdmin
    .from('schools')
    .update({ created_by: appUser.id })
    .eq('id', schoolId)
    .is('created_by', null);

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
    const { data: existingSubject, error: subjectLookupError } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', 'เช็กชื่อทั่วไป')
      .maybeSingle();
    if (subjectLookupError) throw new Error(subjectLookupError.message);
    if (!existingSubject) {
      const { error: subjectError } = await supabaseAdmin.from('subjects').insert({
        school_id: schoolId,
        academic_year_id: academicYear.id,
        semester_id: semester.id,
        code: 'ATTENDANCE',
        name: 'เช็กชื่อทั่วไป',
        credits: 0,
        study_hours: 0,
        status: 'published',
        created_by: appUser.id,
      });
      if (subjectError) throw new Error(subjectError.message);
    }
  }
}

/**
 * Repairs paid individual orders created by free checkout flows that wrote a
 * buyer license but skipped the normal EKRU provisioning callback.
 */
export async function recoverPersonalWorkspacePurchases(authUserId: string) {
  const now = new Date().toISOString();
  const { data: buyer, error: buyerError } = await supabaseAdmin
    .from('marketplace_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .maybeSingle();
  if (buyerError) throw new Error(buyerError.message);
  if (!buyer) return { recovered: false, count: 0 };

  const { data, error: licenseError } = await supabaseAdmin
    .from('marketplace_user_licenses')
    .select('order_item_id, product_id, feature_keys, expires_at, grants_plan_code')
    .eq('buyer_id', buyer.id)
    .eq('status', 'active')
    .lte('starts_at', now)
    .gt('expires_at', now);
  if (licenseError) throw new Error(licenseError.message);

  const licenses = (data ?? []).filter(
    (license): license is RecoverableLicense =>
      typeof license.order_item_id === 'string' &&
      typeof license.product_id === 'string' &&
      Array.isArray(license.feature_keys) &&
      hasPersonalWorkspaceFeatures(license.feature_keys)
  );
  if (!licenses.length) return { recovered: false, count: 0 };

  const orderItemIds = licenses.map((license) => license.order_item_id);
  const productIds = [...new Set(licenses.map((license) => license.product_id))];
  const [{ data: events }, { data: products }, { data: plans }] = await Promise.all([
    supabaseAdmin
      .from('marketplace_provision_events')
      .select('order_item_id')
      .in('order_item_id', orderItemIds),
    supabaseAdmin
      .from('marketplace_products')
      .select('id, grants_plan_code')
      .in('id', productIds),
    supabaseAdmin
      .from('subscription_plans')
      .select('code, target_scope, enabled_features')
      .eq('is_active', true)
      .in('target_scope', ['individual', 'both']),
  ]);
  const provisionedOrderItems = new Set((events ?? []).map((event) => event.order_item_id));
  const planByProduct = new Map(
    (products ?? []).map((product) => [product.id, product.grants_plan_code as string | null])
  );
  const pending = licenses.filter(
    (license) => !provisionedOrderItems.has(license.order_item_id)
  );
  const workspace = await ensurePersonalWorkspace(authUserId);
  let recoveredCount = 0;
  const seedAttendance = licenses.some((license) =>
    license.feature_keys.includes('teacher.qr_attendance')
  );

  for (const license of pending) {
    const matchedPlan = (plans ?? []).find((plan) =>
      sameFeatures(license.feature_keys, plan.enabled_features ?? [])
    );
    const planCode =
      license.grants_plan_code || planByProduct.get(license.product_id) || matchedPlan?.code;
    if (!planCode) {
      throw new Error('Unable to map the individual license to an EKRU subscription plan');
    }

    const { error } = await supabaseAdmin.rpc('provision_personal_workspace_purchase', {
      p_order_item_id: license.order_item_id,
      p_buyer_auth_user_id: authUserId,
      p_plan_code: planCode,
      p_feature_keys: license.feature_keys,
      p_expires_at: license.expires_at,
      p_school_id: workspace.id,
    });
    if (error) throw new Error(error.message);
    recoveredCount += 1;
  }

  await finalizePersonalWorkspace(authUserId, workspace.id, { seedAttendance });
  return { recovered: recoveredCount > 0, count: recoveredCount };
}
