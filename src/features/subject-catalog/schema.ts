import * as z from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

export const subjectCatalogInputSchema = z.object({
  curriculumId: z.uuid().optional(),
  code: optionalText(100),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อรายวิชา').max(300),
  nameEn: optionalText(300),
  description: optionalText(2000),
  learningArea: optionalText(100),
  subjectType: optionalText(100),
  educationStage: optionalText(100),
  gradeLevels: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  learningStandardCode: optionalText(100),
  learningStandards: optionalText(20000),
  learningOutcomes: optionalText(20000),
  learningUnits: optionalText(20000),
  scope: z.enum(['personal', 'public']),
  status: z.enum(['draft', 'published']),
  indicators: z
    .array(
      z.object({
        id: z.uuid().optional(),
        code: z.string().trim().min(1, 'กรุณากรอกรหัสตัวชี้วัด').max(100),
        description: z.string().trim().min(1, 'กรุณากรอกรายละเอียดตัวชี้วัด').max(5000),
        learningStandard: optionalText(5000),
      })
    )
    .max(300)
    .default([]),
  learningOutcomesStructured: z
    .array(
      z.object({
        id: z.uuid().optional(),
        code: optionalText(100),
        description: z.string().trim().min(1).max(10000),
      })
    )
    .max(300)
    .default([]),
  learningUnitsStructured: z
    .array(
      z.object({
        id: z.uuid().optional(),
        code: optionalText(100),
        name: z.string().trim().min(1).max(500),
        description: optionalText(10000),
        estimatedPeriods: z.number().int().min(1).max(200).optional(),
      })
    )
    .max(300)
    .default([]),
});

export type ParsedSubjectCatalogInput = z.infer<typeof subjectCatalogInputSchema>;
