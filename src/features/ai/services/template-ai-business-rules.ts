import type { TemplateType, TemplateContent } from 'src/features/templates/types';

import { CONTENT_SCHEMAS } from 'src/features/templates/schemas';

import { AIError } from '../errors/ai-error';
import {
  areIndicatorsAllowed,
  hasValidRubricWeights,
  isActivityDurationAllowed,
} from './template-ai-rules';

function removeNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeNulls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== null)
        .map(([key, child]) => [key, removeNulls(child)])
    );
  }
  return value;
}

export function validateTemplateAIBusinessRules(input: {
  templateType: TemplateType;
  content: unknown;
  indicatorIds: string[];
  allowedIndicatorIds: string[];
  durationMinutes?: number;
}) {
  const normalized = removeNulls(input.content);
  const parsed = CONTENT_SCHEMAS[input.templateType].safeParse(normalized);
  if (!parsed.success) throw new AIError('AI_INVALID_OUTPUT', { cause: parsed.error });

  if (!areIndicatorsAllowed(input.indicatorIds, input.allowedIndicatorIds)) {
    throw new AIError('AI_INVALID_OUTPUT');
  }

  if (input.templateType === 'learning_activity' && input.durationMinutes) {
    const duration = (parsed.data as { durationMinutes?: number }).durationMinutes;
    if (!isActivityDurationAllowed(duration, input.durationMinutes)) {
      throw new AIError('AI_INVALID_OUTPUT');
    }
  }

  if (input.templateType === 'rubric') {
    const rubric = parsed.data as {
      passingScore?: number;
      maximumScore?: number;
      criteria: Array<{ weight?: number }>;
    };
    if (!hasValidRubricWeights(rubric.criteria)) {
      throw new AIError('AI_INVALID_OUTPUT');
    }
    if (
      rubric.passingScore !== undefined &&
      rubric.maximumScore !== undefined &&
      rubric.passingScore > rubric.maximumScore
    ) {
      throw new AIError('AI_INVALID_OUTPUT');
    }
  }

  if (input.templateType === 'media') {
    const productId = (parsed.data as { marketplaceProductId?: string }).marketplaceProductId;
    if (productId) throw new AIError('AI_INVALID_OUTPUT');
  }

  return parsed.data as TemplateContent;
}
