import * as z from 'zod';

import { templateTypeSchema } from './template-base.schema';

export const lessonPlanTemplateSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        sectionType: templateTypeSchema,
        templateId: z.uuid().optional(),
        title: z.string().trim().min(1).max(500),
        order: z.number().int().min(0),
        required: z.boolean(),
      })
    )
    .min(1, 'กรุณาเพิ่ม Section อย่างน้อย 1 รายการ')
    .max(50),
});
