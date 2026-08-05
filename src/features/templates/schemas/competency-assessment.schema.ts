import * as z from 'zod';

export const competencyAssessmentSchema = z.object({
  title: z.string().trim().min(1).max(300),
  instructions: z.string().trim().max(2000).default(''),
  domains: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().min(1).max(300),
        competencyLabel: z.string().trim().min(1).max(500),
      })
    )
    .min(1)
    .max(20),
  students: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().max(300),
        scores: z.array(z.coerce.number().int().min(0).max(3)).max(20),
      })
    )
    .min(1)
    .max(100),
  qualityLevels: z
    .array(
      z.object({
        id: z.string().min(1),
        score: z.coerce.number().int().min(0).max(3),
        label: z.string().trim().min(1).max(100),
      })
    )
    .min(1)
    .max(4),
  passingScore: z.coerce.number().int().min(0).max(3),
  passingNote: z.string().trim().max(2000).default(''),
  evaluatorName: z.string().trim().max(300).default(''),
  evaluatorRole: z.string().trim().max(200).default('ผู้ประเมิน'),
  evaluationDate: z.string().trim().max(100).default(''),
});
