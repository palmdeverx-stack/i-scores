import { z } from 'zod';

export const PurchaseRequestSchema = z
  .object({
    title: z.string().trim().min(1, 'กรุณาระบุหัวข้อขอจัดซื้อ').max(200),
    purpose: z.string().trim().min(1, 'กรุณาระบุเหตุผล / ความจำเป็น').max(2000),
    lines: z
      .array(
        z.object({
          item_id: z.uuid({ error: 'กรุณาเลือกพัสดุ' }),
          quantity: z
            .number({ error: 'กรุณากรอกจำนวน' })
            .int('จำนวนต้องเป็นจำนวนเต็ม')
            .min(1, 'จำนวนต้องมากกว่า 0')
            .max(1000000000),
        })
      )
      .min(1, 'กรุณาเพิ่มอย่างน้อย 1 รายการ')
      .max(100),
  })
  .refine((value) => new Set(value.lines.map((line) => line.item_id)).size === value.lines.length, {
    path: ['lines'],
    message: 'พัสดุซ้ำ กรุณารวมจำนวนในรายการเดียว',
  });
export const PurchaseReviewSchema = z
  .object({ approve: z.boolean(), note: z.string().trim().max(1000) })
  .refine((value) => value.approve || Boolean(value.note), {
    path: ['note'],
    message: 'กรุณาระบุเหตุผลในการปฏิเสธ',
  });
export const PurchaseOrderSchema = z.object({
  supplier: z.string().trim().min(1, 'กรุณาระบุผู้จำหน่าย').max(200),
  order_number: z.string().trim().min(1, 'กรุณาระบุเลขที่ใบสั่งซื้อ').max(200),
  order_date: z.iso.date({ error: 'กรุณาระบุวันที่ใบสั่งซื้อ' }),
});
export type PurchaseRequestValues = z.infer<typeof PurchaseRequestSchema>;
export type PurchaseReviewValues = z.infer<typeof PurchaseReviewSchema>;
export type PurchaseOrderValues = z.infer<typeof PurchaseOrderSchema>;

export const PurchaseDraftSchema = z
  .object({
    title: z.string().trim().min(1, 'กรุณาระบุหัวข้อแบบร่าง').max(200),
    purpose: z.string().trim().max(2000),
    lines: z
      .array(z.object({ item_id: z.uuid(), quantity: z.number().int().min(1).max(1000000000) }))
      .max(100),
  })
  .refine((v) => new Set(v.lines.map((line) => line.item_id)).size === v.lines.length, {
    path: ['lines'],
    message: 'รายการพัสดุซ้ำ',
  });
