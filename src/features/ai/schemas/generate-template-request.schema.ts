import * as z from 'zod';

import { templateTypeSchema } from 'src/features/templates/schemas';

export const templateAIActionSchema = z.enum([
  'generate',
  'improve',
  'rewrite',
  'shorten',
  'expand',
  'regenerate',
  'suggest_tags',
  'suggest_metadata',
]);

export const generateTemplateRequestSchema = z.object({
  action: templateAIActionSchema,
  templateType: templateTypeSchema,
  topic: z.string().trim().min(1).max(500),
  subjectId: z.uuid().optional(),
  gradeLevels: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  indicatorIds: z.array(z.uuid()).max(100).default([]),
  teachingMethod: z.string().trim().max(200).optional(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  classroomContext: z.string().trim().max(2000).optional(),
  learnerCount: z.number().int().min(1).max(1000).optional(),
  availableResources: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  objectives: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
  additionalInstructions: z.string().trim().max(2000).optional(),
  language: z.enum(['th', 'en']).default('th'),
  detailLevel: z.enum(['concise', 'standard', 'detailed']).default('standard'),
  existingTemplateId: z.uuid().optional(),
  existingContent: z.unknown().optional(),
  existingTags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  existingMetadata: z.unknown().optional(),
  section: z.string().trim().max(100).optional(),
  idempotencyKey: z.uuid(),
});

export type GenerateTemplateRequest = z.infer<typeof generateTemplateRequestSchema>;
