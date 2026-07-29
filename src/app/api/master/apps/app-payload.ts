const CODE_PATTERN = /^[A-Z0-9_]+$/;
const FEATURE_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
const LAUNCH_PATH_PATTERN = /^\/apps\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export function parseAppPayload(body: unknown) {
  const value = body as Record<string, unknown> | null;
  const code = typeof value?.code === 'string' ? value.code.trim().toUpperCase() : '';
  const name = typeof value?.name === 'string' ? value.name.trim() : '';
  const launchPath = typeof value?.launchPath === 'string' ? value.launchPath.trim() : '';
  const requiredFeatureKey =
    typeof value?.requiredFeatureKey === 'string' ? value.requiredFeatureKey.trim() : '';
  const supportedScope = value?.supportedScope;
  const isActive = value?.isActive;

  if (
    !CODE_PATTERN.test(code) ||
    !name ||
    name.length > 150 ||
    !LAUNCH_PATH_PATTERN.test(launchPath) ||
    !FEATURE_PATTERN.test(requiredFeatureKey) ||
    !['individual', 'school', 'both'].includes(String(supportedScope)) ||
    typeof isActive !== 'boolean'
  ) {
    return null;
  }

  return {
    code,
    name,
    launch_path: launchPath,
    required_feature_key: requiredFeatureKey,
    supported_scope: supportedScope as 'individual' | 'school' | 'both',
    is_active: isActive,
  };
}
