import 'server-only';

import type { TemplateType } from 'src/features/templates/types';
import type { AIQuota, AIErrorCode, TemplateAIAction } from '../types/ai.types';

import { supabaseAdmin } from 'src/lib/supabase-admin';

import { AIError } from '../errors/ai-error';
import { aiConfig } from '../config/ai.config';

type UsageIdentity = { userId: string; schoolId: string | null };

const startOfUtcDay = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
};

const startOfUtcMonth = () => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
};

export async function getTemplateAIQuota(userId: string): Promise<AIQuota> {
  const [today, month] = await Promise.all([
    supabaseAdmin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', 'template')
      .eq('status', 'success')
      .gte('created_at', startOfUtcDay()),
    supabaseAdmin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', 'template')
      .eq('status', 'success')
      .gte('created_at', startOfUtcMonth()),
  ]);
  if (today.error || month.error) throw new AIError('AI_PROVIDER_ERROR');
  const usedToday = today.count ?? 0;
  const usedThisMonth = month.count ?? 0;
  return {
    dailyLimit: aiConfig.dailyQuota,
    monthlyLimit: aiConfig.monthlyQuota,
    usedToday,
    usedThisMonth,
    remaining: Math.max(
      0,
      Math.min(aiConfig.dailyQuota - usedToday, aiConfig.monthlyQuota - usedThisMonth)
    ),
  };
}

export async function enforceTemplateAIQuota(userId: string) {
  const quota = await getTemplateAIQuota(userId);
  if (quota.remaining <= 0) throw new AIError('AI_QUOTA_EXCEEDED');
  return quota;
}

export async function beginTemplateAIUsage(
  identity: UsageIdentity,
  input: { action: TemplateAIAction; templateType: TemplateType; idempotencyKey: string }
) {
  const { data, error } = await supabaseAdmin
    .from('ai_usage_logs')
    .insert({
      user_id: identity.userId,
      school_id: identity.schoolId,
      feature: 'template',
      action: input.action,
      provider: aiConfig.provider,
      model: aiConfig.templateModel,
      template_type: input.templateType,
      status: 'pending',
      idempotency_key: input.idempotencyKey,
    })
    .select('id')
    .single();
  if (error?.code === '23505') throw new AIError('AI_RATE_LIMITED');
  if (error || !data) throw new AIError('AI_PROVIDER_ERROR', { cause: error });
  return data.id as string;
}

export async function finishTemplateAIUsage(
  id: string,
  input: {
    status: 'success' | 'error';
    model?: string;
    requestId?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    durationMs: number;
    errorCode?: AIErrorCode;
  }
) {
  await supabaseAdmin
    .from('ai_usage_logs')
    .update({
      status: input.status,
      model: input.model,
      request_id: input.requestId,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      total_tokens: input.totalTokens,
      duration_ms: input.durationMs,
      error_code: input.errorCode,
    })
    .eq('id', id);
}
