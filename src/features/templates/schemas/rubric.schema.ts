import * as z from 'zod';

const rubricLevelSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().min(1),
  label: z.string().trim().min(1).max(200),
  score: z.number().min(0),
  description: z.string().trim().min(1).max(5000),
});

export const rubricSchema = z
  .object({
    rubricType: z.enum(['analytic', 'holistic', 'checklist', 'rating_scale']),
    scoreType: z.enum(['score', 'percentage', 'level']),
    maximumScore: z.number().positive().optional(),
    passingScore: z.number().min(0).optional(),
    criteria: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1).max(500),
          description: z.string().trim().max(2000).optional(),
          weight: z.number().min(0).max(100).optional(),
          levels: z.array(rubricLevelSchema).min(1).max(10),
        })
      )
      .min(1, 'กรุณาเพิ่มเกณฑ์อย่างน้อย 1 รายการ')
      .max(50),
  })
  .superRefine((value, context) => {
    const totalWeight = value.criteria.reduce((sum, row) => sum + (row.weight ?? 0), 0);
    if (totalWeight > 100)
      context.addIssue({
        code: 'custom',
        path: ['criteria'],
        message: 'น้ำหนักรวมต้องไม่เกิน 100%',
      });
    if (
      value.passingScore !== undefined &&
      value.maximumScore !== undefined &&
      value.passingScore > value.maximumScore
    ) {
      context.addIssue({
        code: 'custom',
        path: ['passingScore'],
        message: 'คะแนนผ่านต้องไม่เกินคะแนนเต็ม',
      });
    }
  });
