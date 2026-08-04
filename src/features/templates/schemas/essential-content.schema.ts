import * as z from 'zod';

export const essentialContentSchema = z.object({
  content: z.string().trim().min(1, 'กรุณากรอกสาระสำคัญ').max(30000),
  keyConcepts: z.array(z.string().trim().min(1).max(500)).max(100),
});
