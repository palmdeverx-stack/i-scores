import 'server-only';

const integerEnv = (name: string, fallback: number, min: number, max: number) => {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
};

export const DEFAULT_AI_MODEL = 'gpt-5.6';

export const aiConfig = {
  provider: 'openai' as const,
  templateModel: process.env.OPENAI_TEMPLATE_MODEL?.trim() || DEFAULT_AI_MODEL,
  templateMaxOutputTokens: integerEnv('OPENAI_TEMPLATE_MAX_OUTPUT_TOKENS', 4000, 500, 16000),
  templateEnabled: process.env.OPENAI_TEMPLATE_ENABLED === 'true',
  timeoutMs: integerEnv('OPENAI_TEMPLATE_TIMEOUT_MS', 45000, 5000, 120000),
  rateLimitMax: integerEnv('OPENAI_TEMPLATE_RATE_LIMIT_MAX', 5, 1, 100),
  rateLimitWindowSeconds: integerEnv('OPENAI_TEMPLATE_RATE_LIMIT_WINDOW_SECONDS', 60, 10, 3600),
  dailyQuota: integerEnv('OPENAI_TEMPLATE_DAILY_LIMIT', 20, 1, 10000),
  monthlyQuota: integerEnv('OPENAI_TEMPLATE_MONTHLY_LIMIT', 200, 1, 100000),
};

export const isTemplateAIEnabled = aiConfig.templateEnabled;
