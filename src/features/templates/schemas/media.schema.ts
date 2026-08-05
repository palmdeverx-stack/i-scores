import * as z from 'zod';

const mediaTypeSchema = z.enum([
  'worksheet',
  'slide',
  'video',
  'website',
  'book',
  'game',
  'quiz',
  'equipment',
  'other',
]);

const mediaItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  mediaType: mediaTypeSchema,
  title: z.string().trim().min(1, 'กรุณากรอกชื่อสื่อ').max(500),
  description: z.string().trim().max(5000).optional(),
  url: z.union([z.url('URL ไม่ถูกต้อง'), z.literal('')]).optional(),
  marketplaceProductId: z.string().trim().max(200).optional(),
  usageInstructions: z.string().trim().max(5000).optional(),
});

export const mediaSchema = z
  .object({
    items: z.array(mediaItemSchema).min(1).max(100).optional(),
    // Legacy fields are retained so existing templates and AI results can be migrated safely.
    mediaType: mediaTypeSchema.optional(),
    title: z.string().trim().max(500).optional(),
    description: z.string().trim().max(5000).optional(),
    url: z.union([z.url('URL ไม่ถูกต้อง'), z.literal('')]).optional(),
    marketplaceProductId: z.string().trim().max(200).optional(),
    usageInstructions: z.string().trim().max(5000).optional(),
  })
  .superRefine((value, context) => {
    if (value.items?.length || value.title?.trim()) return;
    context.addIssue({
      code: 'custom',
      path: ['items'],
      message: 'กรุณาเพิ่มสื่อหรือแหล่งเรียนรู้อย่างน้อย 1 รายการ',
    });
  });
