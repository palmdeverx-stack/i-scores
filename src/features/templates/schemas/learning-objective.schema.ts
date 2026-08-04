import * as z from 'zod';

export const learningObjectiveSchema = z.object({
  description: z.string().trim().min(1, 'กรุณากรอกข้อความจุดประสงค์').max(5000),
  domain: z.enum(['knowledge', 'process', 'attitude']),
  behaviorVerb: z.string().trim().max(200).optional(),
  condition: z.string().trim().max(1000).optional(),
  expectedResult: z.string().trim().max(2000).optional(),
  successCriteria: z.string().trim().max(2000).optional(),
});
