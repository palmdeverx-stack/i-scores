import type { TemplateType, TemplateContent, TemplateMetadata } from 'src/features/templates/types';

export type TemplateAIAction =
  | 'generate'
  | 'improve'
  | 'rewrite'
  | 'shorten'
  | 'expand'
  | 'regenerate'
  | 'suggest_tags'
  | 'suggest_metadata';

export type AIErrorCode =
  | 'AI_DISABLED'
  | 'AI_NOT_CONFIGURED'
  | 'AI_RATE_LIMITED'
  | 'AI_QUOTA_EXCEEDED'
  | 'AI_INVALID_INPUT'
  | 'AI_INVALID_OUTPUT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_TIMEOUT'
  | 'AI_CONTENT_REJECTED';

export type AIQuota = {
  dailyLimit?: number;
  monthlyLimit?: number;
  usedToday: number;
  usedThisMonth: number;
  remaining: number;
};

export type AIGenerationMetadata = {
  isAIGenerated: boolean;
  aiProvider?: 'openai';
  aiModel?: string;
  aiGeneratedAt?: string;
  aiAction?: TemplateAIAction;
  aiRequestId?: string;
};

export type TemplateAIResult = {
  name: string;
  description: string;
  content: TemplateContent;
  tags: string[];
  metadata: TemplateMetadata;
  indicatorIds: string[];
  warnings: string[];
  generation: AIGenerationMetadata;
  quota: AIQuota;
};

export type TemplateAIContext = {
  templateType: TemplateType;
  subject: null | {
    id: string;
    code: string | null;
    name: string;
    learningArea: string | null;
    learningStandards: string;
    indicators: string;
  };
  indicators: Array<{
    id: string;
    code: string;
    description: string;
    learningStandard: string | null;
  }>;
  relatedTemplates: Array<{ name: string; description: string | null }>;
};
