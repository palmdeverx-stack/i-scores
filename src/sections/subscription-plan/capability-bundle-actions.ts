'use client';

import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';
import type { SubscriptionPlanTargetScope } from './subscription-plan-actions';

// ----------------------------------------------------------------------

export type CapabilityBundle = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  target_scope: SubscriptionPlanTargetScope;
  version: number;
  feature_keys: SchoolFeatureKey[];
  is_active: boolean;
  sort_order: number;
};

export type CreateCapabilityBundleInput = {
  code: string;
  name: string;
  description: string;
  targetScope: SubscriptionPlanTargetScope;
  featureKeys: SchoolFeatureKey[];
};

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message ?? fallbackMessage);
  return json;
}

export async function listCapabilityBundles(): Promise<CapabilityBundle[]> {
  const response = await fetch('/api/capability-bundles');
  const data = await parseResponse<{ bundles: CapabilityBundle[] }>(
    response,
    'ไม่สามารถโหลดชุดความสามารถได้'
  );
  return data.bundles;
}

export async function createCapabilityBundle(
  input: CreateCapabilityBundleInput
): Promise<CapabilityBundle> {
  const response = await fetch('/api/capability-bundles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseResponse<{ bundle: CapabilityBundle }>(
    response,
    'ไม่สามารถสร้างชุดความสามารถได้'
  );
  return data.bundle;
}
