import type { InventoryItem } from './types';

import { z } from 'zod';

export type InventoryMovementKind = 'receive' | 'issue';

export const InventoryMovementSchema = z.object({
  item_id: z.uuid({ error: 'กรุณาเลือกพัสดุ' }),
  quantity: z
    .number({ error: 'กรุณากรอกจำนวนเป็นตัวเลข' })
    .int('จำนวนต้องเป็นจำนวนเต็ม')
    .min(1, 'จำนวนต้องมากกว่า 0')
    .max(1000000000, 'จำนวนสูงเกินกำหนด'),
  recipient: z.string().trim().max(200, 'กรอกได้ไม่เกิน 200 ตัวอักษร'),
  note: z.string().trim().max(1000, 'กรอกได้ไม่เกิน 1,000 ตัวอักษร'),
});

export function createInventoryMovementSchema(kind: InventoryMovementKind, items: InventoryItem[]) {
  return InventoryMovementSchema.superRefine((values, context) => {
    const item = items.find((entry) => entry.id === values.item_id);
    if (!item)
      context.addIssue({
        code: 'custom',
        path: ['item_id'],
        message: 'ไม่พบพัสดุในโรงเรียนนี้ กรุณาเลือกใหม่',
      });
    if (kind === 'issue') {
      if (!values.recipient)
        context.addIssue({
          code: 'custom',
          path: ['recipient'],
          message: 'กรุณาระบุผู้เบิก / ผู้รับพัสดุ',
        });
      if (item && values.quantity > item.quantity)
        context.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: `คงเหลือเพียง ${item.quantity} ${item.unit}`,
        });
    }
  });
}

export type InventoryMovementFormValues = z.infer<typeof InventoryMovementSchema>;

export const InventoryDocumentSchema = z.object({
  source_request_id: z.uuid().nullable().optional(),
  source_purchase_id: z.uuid().nullable().optional(),
  reference_number: z.string().trim().max(200).optional(),
  document_date: z.union([z.iso.date(), z.literal('')]).optional(),
  recipient: InventoryMovementSchema.shape.recipient,
  note: InventoryMovementSchema.shape.note,
  lines: z
    .array(InventoryMovementSchema.pick({ item_id: true, quantity: true }))
    .min(1, 'กรุณาเพิ่มพัสดุอย่างน้อย 1 รายการ')
    .max(100, 'หนึ่งใบมีได้ไม่เกิน 100 รายการ'),
});

export function createInventoryDocumentSchema(kind: InventoryMovementKind, items: InventoryItem[]) {
  return InventoryDocumentSchema.superRefine((values, context) => {
    if (kind === 'issue' && !values.recipient)
      context.addIssue({
        code: 'custom',
        path: ['recipient'],
        message: 'กรุณาระบุผู้เบิก / ผู้รับพัสดุ',
      });
    if (kind === 'receive') {
      if (!values.reference_number)
        context.addIssue({
          code: 'custom',
          path: ['reference_number'],
          message: 'กรุณาระบุเลขที่เอกสารรับเข้า',
        });
      if (!values.document_date)
        context.addIssue({
          code: 'custom',
          path: ['document_date'],
          message: 'กรุณาระบุวันที่เอกสาร',
        });
    }
    const seen = new Set<string>();
    values.lines.forEach((line, index) => {
      const item = items.find((entry) => entry.id === line.item_id);
      if (kind === 'issue' && item?.item_type === 'equipment')
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'item_id'],
          message: 'ครุภัณฑ์ต้องขึ้นทะเบียนและนำไปใช้งานจากทะเบียนครุภัณฑ์',
        });
      if (!item)
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'item_id'],
          message: 'กรุณาเลือกพัสดุของโรงเรียน',
        });
      if (seen.has(line.item_id))
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'item_id'],
          message: 'พัสดุซ้ำ กรุณารวมจำนวนในรายการเดียว',
        });
      seen.add(line.item_id);
    });
  });
}
export type InventoryDocumentFormValues = z.infer<typeof InventoryDocumentSchema>;
