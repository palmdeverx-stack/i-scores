import * as z from 'zod';

export const desiredCharacteristicAssessmentSchema = z.object({
  title: z.string().trim().min(1).max(300),
  instructions: z.string().trim().max(2000).default(''),
  characteristicGroups: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().min(1).max(300),
        behaviors: z
          .array(
            z.object({
              id: z.string().min(1),
              title: z.string().trim().min(1).max(500),
            })
          )
          .min(1)
          .max(20),
      })
    )
    .min(1)
    .max(20),
  students: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().max(300),
        scores: z.array(z.coerce.number().int().min(0).max(3)).max(100),
      })
    )
    .min(1)
    .max(100),
  qualityLevels: z
    .array(
      z.object({
        id: z.string().min(1),
        minimumScore: z.coerce.number().int().min(0).max(1000),
        maximumScore: z.coerce.number().int().min(0).max(1000).optional(),
        label: z.string().trim().min(1).max(100),
      })
    )
    .min(1)
    .max(20),
  passingScore: z.coerce.number().int().min(0).max(1000),
  passingNote: z.string().trim().max(2000).default(''),
  evaluatorName: z.string().trim().max(300).default(''),
  evaluatorRole: z.string().trim().max(200).default('ผู้ประเมิน'),
  evaluationDate: z.string().trim().max(100).default(''),
});
