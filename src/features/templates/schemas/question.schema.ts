import * as z from 'zod';

export const questionSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        question: z.string().trim().min(1).max(5000),
        bloomLevel: z
          .enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
          .optional(),
        expectedAnswer: z.string().trim().max(10000).optional(),
        followUpQuestions: z.array(z.string().trim().min(1).max(5000)).max(20).optional(),
      })
    )
    .min(1, 'กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ')
    .max(100),
});
