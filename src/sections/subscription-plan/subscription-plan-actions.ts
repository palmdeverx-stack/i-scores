'use client';

import type { SchoolFeatureKey } from 'src/lib/school-subscription-config';

import { getStoredToken } from 'src/auth/context/jwt/utils';

// ----------------------------------------------------------------------

export type SubscriptionPlanBillingCycle = 'monthly' | 'yearly' | 'custom';

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_cycle: SubscriptionPlanBillingCycle;
  price: number;
  currency: string;
  max_school_admins: number;
  max_teachers: number;
  max_students: number;
  enabled_features: SchoolFeatureKey[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlanInput = {
  code: string;
  name: string;
  description: string;
  billingCycle: SubscriptionPlanBillingCycle;
  price: number;
  maxSchoolAdmins: number;
  maxTeachers: number;
  maxStudents: number;
  enabledFeatures: SchoolFeatureKey[];
  isActive: boolean;
  sortOrder: number;
};

function authHeaders(json = false) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${getStoredToken()}`,
  };
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message ?? fallbackMessage);
  return json;
}

export async function listSubscriptionPlans(includeInactive = true): Promise<SubscriptionPlan[]> {
  const response = await fetch(
    `/api/subscription-plans?includeInactive=${includeInactive ? 'true' : 'false'}`,
    { headers: authHeaders() }
  );
  const data = await parseResponse<{ plans: SubscriptionPlan[] }>(
    response,
    'ไม่สามารถโหลดแพ็กเกจได้'
  );
  return data.plans;
}

export async function createSubscriptionPlan(
  input: SubscriptionPlanInput
): Promise<SubscriptionPlan> {
  const response = await fetch('/api/subscription-plans', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  const data = await parseResponse<{ plan: SubscriptionPlan }>(
    response,
    'ไม่สามารถสร้างแพ็กเกจได้'
  );
  return data.plan;
}

export async function updateSubscriptionPlan(
  id: string,
  input: SubscriptionPlanInput
): Promise<SubscriptionPlan> {
  const response = await fetch(`/api/subscription-plans/${id}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  const data = await parseResponse<{ plan: SubscriptionPlan }>(
    response,
    'ไม่สามารถแก้ไขแพ็กเกจได้'
  );
  return data.plan;
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  const response = await fetch(`/api/subscription-plans/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseResponse<{ success: boolean }>(response, 'ไม่สามารถลบแพ็กเกจได้');
}
