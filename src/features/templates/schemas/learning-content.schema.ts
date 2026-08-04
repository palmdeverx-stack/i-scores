import * as z from 'zod';

export const learningContentSchema = z.object({
  topics: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().trim().min(1, 'กรุณากรอกชื่อหัวข้อ').max(500),
        description: z.string().trim().max(5000).optional(),
        order: z.number().int().min(0),
      })
    )
    .min(1, 'กรุณาเพิ่มหัวข้ออย่างน้อย 1 รายการ')
    .max(100),
});
