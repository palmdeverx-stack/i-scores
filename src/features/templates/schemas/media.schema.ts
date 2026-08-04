import * as z from 'zod';

export const mediaSchema = z.object({
  mediaType: z.enum([
    'worksheet',
    'slide',
    'video',
    'website',
    'book',
    'game',
    'quiz',
    'equipment',
    'other',
  ]),
  title: z.string().trim().min(1, 'กรุณากรอกชื่อสื่อ').max(500),
  description: z.string().trim().max(5000).optional(),
  url: z.union([z.url('URL ไม่ถูกต้อง'), z.literal('')]).optional(),
  marketplaceProductId: z.string().trim().max(200).optional(),
  usageInstructions: z.string().trim().max(5000).optional(),
});
