import { ALL_SCHOOL_FEATURE_KEYS } from 'src/lib/school-subscription-config';

// ----------------------------------------------------------------------

export const BILLING_CYCLES = ['monthly', 'yearly', 'one_time', 'custom'] as const;
export const PLAN_TARGET_SCOPES = ['individual', 'school', 'both'] as const;
const FEATURE_KEYS = new Set<string>(ALL_SCHOOL_FEATURE_KEYS);

export type PlanPayload = {
  code: string;
  name: string;
  description: string | null;
  target_scope: (typeof PLAN_TARGET_SCOPES)[number];
  billing_cycle: (typeof BILLING_CYCLES)[number];
  price: number;
  currency: string;
  max_school_admins: number;
  max_teachers: number;
  max_students: number;
  max_line_notifications: number;
  enabled_features: string[];
  source_bundles: PlanBundleSnapshot[];
  is_active: boolean;
  sort_order: number;
};

type PlanBundleSnapshot = {
  id: string;
  code: string;
  name: string;
  version: number;
  featureKeys: string[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBundleSnapshots(value: unknown): PlanBundleSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const snapshots: PlanBundleSnapshot[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const snapshot = item as Record<string, unknown>;
    if (
      typeof snapshot.id !== 'string' ||
      !UUID_PATTERN.test(snapshot.id) ||
      typeof snapshot.code !== 'string' ||
      !/^[A-Z0-9_-]+$/.test(snapshot.code) ||
      typeof snapshot.name !== 'string' ||
      !snapshot.name.trim() ||
      !Number.isInteger(snapshot.version) ||
      Number(snapshot.version) < 1 ||
      !Array.isArray(snapshot.featureKeys) ||
      snapshot.featureKeys.some((key) => typeof key !== 'string' || !FEATURE_KEYS.has(key))
    ) {
      return null;
    }
    snapshots.push({
      id: snapshot.id,
      code: snapshot.code,
      name: snapshot.name.trim().slice(0, 100),
      version: Number(snapshot.version),
      featureKeys: Array.from(new Set(snapshot.featureKeys as string[])),
    });
  }
  return snapshots;
}

export function parsePlanPayload(body: unknown): PlanPayload | null {
  if (!body || typeof body !== 'object') return null;

  const value = body as Record<string, unknown>;
  const code = typeof value.code === 'string' ? value.code.trim().toUpperCase() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const description =
    typeof value.description === 'string' ? value.description.trim().slice(0, 500) : '';
  const targetScope = value.targetScope;
  const maxSchoolAdmins = Number(value.maxSchoolAdmins);
  const maxTeachers = Number(value.maxTeachers);
  const maxStudents = Number(value.maxStudents);
  const maxLineNotifications = Number(value.maxLineNotifications);
  const enabledFeatures = value.enabledFeatures;
  const sourceBundles = parseBundleSnapshots(value.sourceBundles);
  const isActive = value.isActive;
  const sortOrder = Number(value.sortOrder);
  const hasUsageQuotas = targetScope !== 'individual';

  if (
    !code ||
    code.length > 50 ||
    !/^[A-Z0-9_-]+$/.test(code) ||
    !name ||
    name.length > 100 ||
    !PLAN_TARGET_SCOPES.includes(targetScope as (typeof PLAN_TARGET_SCOPES)[number]) ||
    (hasUsageQuotas &&
      (!Number.isInteger(maxSchoolAdmins) ||
        maxSchoolAdmins < 0 ||
        !Number.isInteger(maxTeachers) ||
        maxTeachers < 0 ||
        !Number.isInteger(maxStudents) ||
        maxStudents < 0 ||
        !Number.isInteger(maxLineNotifications) ||
        maxLineNotifications < 0)) ||
    !Array.isArray(enabledFeatures) ||
    enabledFeatures.length === 0 ||
    enabledFeatures.some((key) => typeof key !== 'string' || !FEATURE_KEYS.has(key)) ||
    sourceBundles === null ||
    typeof isActive !== 'boolean' ||
    !Number.isInteger(sortOrder)
  ) {
    return null;
  }

  return {
    code,
    name,
    description: description || null,
    target_scope: targetScope as (typeof PLAN_TARGET_SCOPES)[number],
    // Pricing and billing are authoritative in E-KRU Marketplace. These
    // compatibility columns are intentionally neutral in this system.
    billing_cycle: 'custom',
    price: 0,
    currency: 'THB',
    max_school_admins: hasUsageQuotas ? maxSchoolAdmins : 0,
    max_teachers: hasUsageQuotas ? maxTeachers : 0,
    max_students: hasUsageQuotas ? maxStudents : 0,
    max_line_notifications: hasUsageQuotas ? maxLineNotifications : 0,
    enabled_features: Array.from(new Set(enabledFeatures)),
    source_bundles: sourceBundles,
    is_active: isActive,
    sort_order: sortOrder,
  };
}
