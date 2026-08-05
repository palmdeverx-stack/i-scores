import * as z from 'zod';

const scoreColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  maximumScore: z.coerce.number().min(0).max(1000),
});

const rubricLevelSchema = z.object({
  level: z.coerce.number().int().min(1).max(10),
  label: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000),
});

export const worksheetAssessmentRecordSchema = z.object({
  title: z.string().trim().min(1).max(300),
  topic: z.string().trim().max(500).default(''),
  scoreColumns: z.array(scoreColumnSchema).min(1).max(10),
  students: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().max(300),
        scores: z.array(z.coerce.number().min(0).max(1000)).max(10),
        result: z.enum(['ผ่าน', 'ไม่ผ่าน', '']).optional().default(''),
      })
    )
    .min(1)
    .max(100),
  rubricCriteria: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().min(1).max(300),
        levels: z.array(rubricLevelSchema).min(1).max(10),
      })
    )
    .min(1)
    .max(20),
  passingScore: z.coerce.number().min(0).max(10000),
  passingCriteria: z.string().trim().max(2000).default(''),
  evaluatorName: z.string().trim().max(300).default(''),
  evaluatorRole: z.string().trim().max(200).default('ผู้ประเมิน'),
  evaluationDate: z.string().trim().max(100).default(''),
});
