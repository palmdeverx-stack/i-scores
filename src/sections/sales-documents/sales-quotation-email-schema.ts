import { z } from 'zod';

export const salesQuotationEmailSchema = z.object({
  recipient: z.string().trim().pipe(z.email('กรุณากรอกอีเมลผู้รับให้ถูกต้อง').max(254)),
  subject: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกหัวข้ออีเมล')
    .max(200)
    .refine(
      (value) => !/[\r\n]/.test(value) && !value.includes(String.fromCharCode(0)),
      'กรุณากรอกหัวข้ออีเมลในบรรทัดเดียว'
    ),
  message: z.string().trim().max(5000, 'ข้อความต้องไม่เกิน 5,000 ตัวอักษร'),
});

export type SalesQuotationEmailInput = z.infer<typeof salesQuotationEmailSchema>;

export function salesQuotationAttachmentName(documentNumber: string) {
  return `${documentNumber.replace(/[^a-z0-9-]/gi, '_')}.pdf`;
}
