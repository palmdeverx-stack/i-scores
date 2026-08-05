import * as z from 'zod';

import { curriculumReferenceShape } from 'src/features/curriculum/schema';

export const templateTypeSchema = z.enum([
  'learning_standard',
  'learning_objective',
  'essential_content',
  'learning_content',
  'learning_activity',
  'assessment',
  'rubric',
  'media',
  'question',
  'reflection',
  'worksheet_assessment_record',
  'competency',
  'competency_assessment',
  'behavior_observation',
  'desired_characteristic',
  'desired_characteristic_assessment',
  'learner_development',
  'learning_task',
  'lesson_plan',
]);

export const templateMetadataSchema = z.object({
  teachingMethods: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  bloomLevels: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  competencyIds: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  characteristicIds: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  estimatedMinutes: z.number().int().min(1).max(10000).optional(),
  keywords: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  suitableFor: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
});

export const templateBaseSchema = z.object({
  ...curriculumReferenceShape,
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ Template').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  templateType: templateTypeSchema,
  scope: z.enum(['personal', 'school']),
  status: z.enum(['draft', 'active', 'archived']),
  metadata: templateMetadataSchema.optional().default({}),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(30)
    .transform((tags) => Array.from(new Set(tags)))
    .optional()
    .default([]),
  courseId: z.preprocess((value) => (value === '' ? null : value), z.uuid().nullable().optional()),
  aiGeneration: z
    .object({
      isAIGenerated: z.boolean(),
      aiProvider: z.literal('openai').optional(),
      aiModel: z.string().trim().max(200).optional(),
      aiGeneratedAt: z.iso.datetime().optional(),
      aiAction: z
        .enum([
          'generate',
          'improve',
          'rewrite',
          'shorten',
          'expand',
          'regenerate',
          'suggest_tags',
          'suggest_metadata',
        ])
        .optional(),
      aiRequestId: z.string().trim().max(200).optional(),
    })
    .optional(),
});
