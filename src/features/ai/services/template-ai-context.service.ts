import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';
import type { TemplateAIContext } from '../types/ai.types';
import type { TemplateType } from 'src/features/templates/types';

import { getVisibleSubject } from 'src/features/subject-catalog/server/subject-catalog-service';
import {
  getTemplates,
  canReadTemplate,
  getTemplateById,
} from 'src/features/templates/server/template-service';

import { AIError } from '../errors/ai-error';

export async function resolveTemplateAIContext(
  caller: AppTokenPayload,
  input: {
    templateType: TemplateType;
    subjectId?: string;
    indicatorIds: string[];
    existingTemplateId?: string;
  }
) {
  let subject: TemplateAIContext['subject'] = null;
  const catalogSubject = input.subjectId ? await getVisibleSubject(caller, input.subjectId) : null;
  if (input.subjectId) {
    if (!catalogSubject) throw new AIError('AI_INVALID_INPUT');
    subject = {
      id: catalogSubject.id,
      code: catalogSubject.code,
      name: catalogSubject.name,
      learningArea: catalogSubject.learning_area,
      learningStandards: [
        catalogSubject.learning_standard_code,
        catalogSubject.learning_standards,
      ]
        .filter(Boolean)
        .join(' '),
      indicators: [
        catalogSubject.indicator_text,
        ...catalogSubject.indicators.map(
          (indicator) => `${indicator.code}: ${indicator.description}`
        ),
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  let indicators: TemplateAIContext['indicators'] = [];
  if (input.indicatorIds.length) {
    if (!catalogSubject || !input.subjectId) throw new AIError('AI_INVALID_INPUT');
    const selected = catalogSubject.indicators.filter((indicator) =>
      input.indicatorIds.includes(indicator.id)
    );
    if (selected.length !== input.indicatorIds.length) throw new AIError('AI_INVALID_INPUT');
    indicators = selected.map((row) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      learningStandard: row.learning_standard,
    }));
  }

  let existingTemplateState:
    | { content: unknown; tags: string[]; metadata: Record<string, unknown> }
    | undefined;
  if (input.existingTemplateId) {
    const template = await getTemplateById(input.existingTemplateId);
    if (!(await canReadTemplate(caller, template)) || !template)
      throw new AIError('AI_INVALID_INPUT');
    if (template.template_type !== input.templateType) throw new AIError('AI_INVALID_INPUT');
    existingTemplateState = {
      content: template.content,
      tags: template.tags,
      metadata: template.metadata,
    };
  }

  const related = await getTemplates(caller, {
    templateType: input.templateType,
    subjectId: input.subjectId,
    status: 'active',
  });

  return {
    context: {
      templateType: input.templateType,
      subject,
      indicators,
      relatedTemplates: related.slice(0, 5).map((template) => ({
        name: template.name,
        description: template.description,
      })),
    } satisfies TemplateAIContext,
    existingTemplateState,
  };
}
