import 'server-only';

import crypto from 'node:crypto';

import { supabaseAdmin } from 'src/lib/supabase-admin';

import { AIError } from '../errors/ai-error';
import { aiConfig } from '../config/ai.config';

export async function enforceTemplateAIRateLimit(userId: string) {
  const digest = crypto.createHash('sha256').update(`template-ai:${userId}`).digest('hex');
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_identifier: `v1:ai:${digest}`,
    p_max_attempts: aiConfig.rateLimitMax,
    p_window_seconds: aiConfig.rateLimitWindowSeconds,
  });
  if (error || data !== true) throw new AIError('AI_RATE_LIMITED', { cause: error });
}
