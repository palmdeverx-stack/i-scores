type PersonalPlan = {
  code: string;
  target_scope: string;
  enabled_features: string[] | null;
};

/** Resolve metadata for older licenses without changing their purchased features. */
export function resolvePersonalLicensePlan(
  license: { grants_plan_code: string | null; feature_keys: string[] },
  productPlanCode: string | null | undefined,
  plans: PersonalPlan[]
): string | null {
  const explicitCode = license.grants_plan_code || productPlanCode;
  if (explicitCode) return explicitCode;

  const purchasedFeatures = new Set(license.feature_keys);
  if (!purchasedFeatures.size) return null;
  const candidates = plans
    .filter((plan) => plan.target_scope === 'individual' || plan.target_scope === 'both')
    .map((plan) => ({ code: plan.code, features: new Set(plan.enabled_features ?? []) }))
    .filter((plan) => [...purchasedFeatures].every((feature) => plan.features.has(feature)))
    .sort(
      (left, right) =>
        left.features.size - right.features.size || left.code.localeCompare(right.code)
    );

  // Exact matches win; otherwise use the smallest plan covering the licensed subset.
  // Provisioning still receives license.feature_keys, never the plan's feature list.
  return candidates[0]?.code ?? null;
}
