import * as z from 'zod';

const learningObjectiveItemSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().trim().max(5000).optional(),
    domain: z.enum(['knowledge', 'process', 'attitude']),
    behaviorVerb: z.string().trim().max(200).optional(),
    condition: z.string().trim().max(1000).optional(),
    expectedResult: z.string().trim().max(2000).optional(),
    successCriteria: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.description?.trim()) return;
    if (!value.behaviorVerb?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['behaviorVerb'],
        message: 'กรุณากรอกคำกริยาพฤติกรรม',
      });
    }
    if (!value.expectedResult?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['expectedResult'],
        message: 'กรุณากรอกผลลัพธ์ที่คาดหวัง',
      });
    }
  });

export const learningObjectiveSchema = z
  .object({
    objectives: z.array(learningObjectiveItemSchema).min(1).max(100).optional(),
    description: z.string().trim().max(5000).optional(),
    domain: z.enum(['knowledge', 'process', 'attitude']).optional(),
    behaviorVerb: z.string().trim().max(200).optional(),
    condition: z.string().trim().max(1000).optional(),
    expectedResult: z.string().trim().max(2000).optional(),
    successCriteria: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.objectives?.length || value.description?.trim()) return;
    context.addIssue({
      code: 'custom',
      path: ['objectives'],
      message: 'กรุณาเพิ่มจุดประสงค์การเรียนรู้อย่างน้อย 1 ข้อ',
    });
  });
