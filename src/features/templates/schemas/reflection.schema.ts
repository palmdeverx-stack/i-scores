import * as z from 'zod';

export const reflectionSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().min(1).max(500),
        placeholder: z.string().trim().max(2000).optional(),
        required: z.boolean().optional(),
      })
    )
    .max(50)
    .optional(),
  studentCount: z.number().int().min(0).max(100000).optional(),
  passedCount: z.number().int().min(0).max(100000).optional(),
  passedPercentage: z.number().min(0).max(100).optional(),
  notPassedCount: z.number().int().min(0).max(100000).optional(),
  notPassedPercentage: z.number().min(0).max(100).optional(),
  specialStudents: z.array(z.string().trim().min(1).max(1000)).max(100).optional().default([]),
  knowledgeResult: z.string().max(30000).optional().default(''),
  processResult: z.string().max(30000).optional().default(''),
  attitudeResult: z.string().max(30000).optional().default(''),
  problems: z.string().max(30000).optional().default(''),
  solutions: z.string().max(30000).optional().default(''),
});
