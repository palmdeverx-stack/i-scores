import { z } from 'zod';

export const NotificationComposeSchema = z.object({
  title: z.string().trim().min(1, 'กรุณาระบุหัวข้อ').max(200),
  body: z.string().trim().min(1, 'กรุณาระบุข้อความ').max(2000),
  recipientIds: z.array(z.uuid()).min(1, 'กรุณาเลือกผู้รับ').max(100, 'เลือกได้สูงสุด 100 คน'),
});
export type NotificationComposeValues = z.infer<typeof NotificationComposeSchema>;
