import * as z from 'zod';

export const structuredListSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        code: z.string().trim().max(100).optional(),
        title: z.string().trim().min(1, 'กรุณากรอกชื่อรายการ').max(500),
        description: z.string().trim().max(10000).default(''),
      })
    )
    .min(1, 'กรุณาเพิ่มอย่างน้อย 1 รายการ')
    .max(100),
});
