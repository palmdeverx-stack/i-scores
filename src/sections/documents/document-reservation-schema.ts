import { z } from 'zod';

export const DocumentReservationSchema = z.object({
  requestedSequence: z
    .string()
    .regex(/^$|^[1-9][0-9]{0,11}$/, 'ระบุเลขจำนวนเต็ม 1–999999999999')
    .optional(),
  templateSlug: z.string().optional(),
  title: z.string().trim().min(1, 'กรุณาระบุเรื่องหรือชื่อโครงการที่จะจัดทำ').max(200),
  purpose: z.string().trim().max(1000),
  plannedDate: z.union([z.iso.date({ error: 'วันที่ไม่ถูกต้อง' }), z.literal('')]),
});
export type DocumentReservationValues = z.infer<typeof DocumentReservationSchema>;
