export function hasValidRubricWeights(criteria: Array<{ weight?: number }>) {
  const hasWeight = criteria.some((criterion) => criterion.weight !== undefined);
  if (!hasWeight) return true;
  return (
    criteria.every((criterion) => criterion.weight !== undefined) &&
    Math.abs(criteria.reduce((sum, row) => sum + (row.weight ?? 0), 0) - 100) <= 0.001
  );
}

export function isActivityDurationAllowed(duration?: number, maximumDuration?: number) {
  return !duration || !maximumDuration || duration <= maximumDuration;
}

export function areIndicatorsAllowed(indicatorIds: string[], allowedIndicatorIds: string[]) {
  const allowed = new Set(allowedIndicatorIds);
  return indicatorIds.every((id) => allowed.has(id));
}
