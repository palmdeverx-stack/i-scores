import { z } from 'zod';

export const InventoryAssetRegisterSchema = z.object({
  item_id: z.uuid({ error: 'กรุณาเลือกครุภัณฑ์' }),
  receipt_movement_id: z.uuid({ error: 'กรุณาเลือกใบรับเข้า' }),
  asset_code: z.string().trim().min(1, 'กรุณาระบุเลขทะเบียนครุภัณฑ์').max(100),
  serial_number: z.string().trim().max(200),
  acquisition_date: z.iso.date({ error: 'กรุณาระบุวันที่ได้มา' }),
  acquisition_cost: z.number({ error: 'กรุณาระบุมูลค่าเป็นตัวเลข' }).min(0).max(999999999999.99),
  notes: z.string().trim().max(2000),
});
export const InventoryAssetActivateSchema = z.object({
  custodian: z.string().trim().min(1, 'กรุณาระบุผู้รับผิดชอบ').max(200),
  location: z.string().trim().min(1, 'กรุณาเลือกสถานที่ใช้งาน').max(200),
});
export type InventoryAssetRegisterValues = z.infer<typeof InventoryAssetRegisterSchema>;
export type InventoryAssetActivateValues = z.infer<typeof InventoryAssetActivateSchema>;
