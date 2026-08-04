import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';
import type { TemplateMetadata } from 'src/features/templates/types';
import type { GenerateTemplateRequest } from '../schemas/generate-template-request.schema';

import { zodTextFormat } from 'openai/helpers/zod';

import { CONTENT_SCHEMAS, templateMetadataSchema } from 'src/features/templates/schemas';

import { AIError, publicAIError } from '../errors/ai-error';
import { openAIProvider } from '../providers/openai.provider';
import { buildTemplateTask } from '../prompts/template-prompts';
import { resolveTemplateAIContext } from './template-ai-context.service';
import { validateTemplateAIBusinessRules } from './template-ai-business-rules';
import { TEMPLATE_SYSTEM_INSTRUCTIONS } from '../prompts/template-system.prompt';
import {
  type RawTemplateAIResponse,
  getGenerateTemplateResponseSchema,
} from '../schemas/generate-template-response.schema';

const PHONE_PATTERN = /(?:\+?66|0)[\s-]?[689]\d(?:[\s-]?\d){7}/;
const THAI_ID_PATTERN = /\b\d{13}\b/;
const SENSITIVE_LABEL_PATTERN = /(ชื่อ(?:และนามสกุล)?|เลขประจำตัว|เบอร์โทร|ข้อมูลสุขภาพ|ผู้ปกครอง)\s*[:：]/i;

export function containsStudentPersonalData(value: unknown) {
  const text = JSON.stringify(value ?? '');
  return PHONE_PATTERN.test(text) || THAI_ID_PATTERN.test(text) || SENSITIVE_LABEL_PATTERN.test(text);
}

function cleanMetadata(value: Record<string, unknown>): TemplateMetadata {
  return {
    teachingMethods: value.teachingMethods as string[],
    bloomLevels: value.bloomLevels as string[],
    competencyIds: value.competencyIds as string[],
    characteristicIds: value.characteristicIds as string[],
    estimatedMinutes:
      typeof value.estimatedMinutes === 'number' ? value.estimatedMinutes : undefined,
    keywords: value.keywords as string[],
    suitableFor: value.suitableFor as string[],
  };
}

export async function generateTemplateWithAI(
  caller: AppTokenPayload,
  request: GenerateTemplateRequest
) {
  if (containsStudentPersonalData(request)) throw new AIError('AI_CONTENT_REJECTED');

  const { context, existingTemplateState } = await resolveTemplateAIContext(
    caller,
    request
  );
  const submittedExisting = request.existingContent
    ? CONTENT_SCHEMAS[request.templateType].safeParse(request.existingContent)
    : null;
  const existingContent =
    (submittedExisting?.success ? submittedExisting.data : undefined) ?? existingTemplateState?.content;
  const submittedMetadata = request.existingMetadata
    ? templateMetadataSchema.safeParse(request.existingMetadata)
    : null;
  const existingMetadata =
    (submittedMetadata?.success ? submittedMetadata.data : undefined) ?? existingTemplateState?.metadata;
  const existingTags = request.existingTags.length ? request.existingTags : existingTemplateState?.tags;

  if (request.action !== 'generate' && !existingContent) throw new AIError('AI_INVALID_INPUT');

  const responseSchema = getGenerateTemplateResponseSchema(request.templateType);
  const format = zodTextFormat(responseSchema, `template_${request.templateType}`);
  const baseInput = {
    request: {
      action: request.action,
      templateType: request.templateType,
      topic: request.topic,
      gradeLevels: request.gradeLevels,
      teachingMethod: request.teachingMethod,
      durationMinutes: request.durationMinutes,
      classroomContext: request.classroomContext,
      learnerCount: request.learnerCount,
      availableResources: request.availableResources,
      objectives: request.objectives,
      additionalInstructions: request.additionalInstructions,
      language: request.language,
      detailLevel: request.detailLevel,
      section: request.section,
    },
    context,
    existingContent,
    existingMetadata,
    existingTags,
  };

  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let previousInvalidOutput: unknown;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const providerResult = await openAIProvider.generateStructuredOutput<unknown, unknown>({
        task: `${buildTemplateTask(request.templateType, request.action)}${
          attempt ? '\nผลลัพธ์ก่อนหน้าไม่ผ่านกฎระบบ ให้ซ่อมเพียงครั้งเดียวและส่ง JSON ที่ถูกต้อง' : ''
        }`,
        instructions: TEMPLATE_SYSTEM_INSTRUCTIONS,
        input: attempt ? { ...baseInput, invalidOutputToRepair: previousInvalidOutput } : baseInput,
        schemaName: `template_${request.templateType}`,
        jsonSchema: format.schema as Record<string, unknown>,
      });
      inputTokens += providerResult.usage?.inputTokens ?? 0;
      outputTokens += providerResult.usage?.outputTokens ?? 0;
      totalTokens += providerResult.usage?.totalTokens ?? 0;

      const parsed = responseSchema.safeParse(providerResult.data);
      if (!parsed.success) {
        previousInvalidOutput = providerResult.data;
        throw new AIError('AI_INVALID_OUTPUT', { cause: parsed.error });
      }

      const raw = parsed.data as RawTemplateAIResponse;
      const generatedContent = validateTemplateAIBusinessRules({
        templateType: request.templateType,
        content: raw.content,
        indicatorIds: raw.indicatorIds,
        allowedIndicatorIds: context.indicators.map((indicator) => indicator.id),
        durationMinutes: request.durationMinutes,
      });
      const content =
        ['suggest_tags', 'suggest_metadata'].includes(request.action) && existingContent
          ? existingContent
          : generatedContent;
      const tags = request.action === 'suggest_metadata' && existingTags ? existingTags : raw.tags;
      const metadata =
        request.action === 'suggest_tags' && existingMetadata
          ? (existingMetadata as TemplateMetadata)
          : cleanMetadata(raw.metadata);

      return {
        result: {
          name: raw.name,
          description: raw.description,
          content,
          tags,
          metadata,
          indicatorIds: raw.indicatorIds,
          warnings: raw.warnings,
          generation: {
            isAIGenerated: true,
            aiProvider: 'openai' as const,
            aiModel: providerResult.model,
            aiGeneratedAt: new Date().toISOString(),
            aiAction: request.action,
            aiRequestId: providerResult.requestId,
          },
        },
        telemetry: {
          model: providerResult.model,
          requestId: providerResult.requestId,
          inputTokens,
          outputTokens,
          totalTokens,
        },
      };
    } catch (error) {
      lastError = error;
      if (!(error instanceof AIError) || error.code !== 'AI_INVALID_OUTPUT' || attempt === 1) break;
    }
  }

  throw publicAIError(lastError);
}

export const improveTemplateWithAI = generateTemplateWithAI;
export const regenerateTemplateSection = generateTemplateWithAI;
export const suggestTemplateTags = generateTemplateWithAI;
export const suggestTemplateMetadata = generateTemplateWithAI;
