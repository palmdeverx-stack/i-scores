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
    .min(1, 'กรุณาเพิ่มหัวข้ออย่างน้อย 1 รายการ')
    .max(50),
});
