import { z } from 'zod';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `กรอกได้ไม่เกิน ${max.toLocaleString('th-TH')} ตัวอักษร`);

export const InventoryItemSchema = z
  .object({
    item_type: z.enum(['material', 'equipment']),
    material_subtype: z.literal('consumable').nullable(),
    code: text(60),
    name: text(200).min(1, 'กรุณากรอกชื่อพัสดุ'),
    category: text(100).min(1, 'กรุณาเลือกหมวดหมู่'),
    unit: text(40).min(1, 'กรุณาเลือกหน่วยนับ'),
    location: text(200),
    description: text(4000),
    brand: text(100),
    model: text(100),
    specifications: text(4000),
    barcode: text(100),
    reference_price: z
      .number({ error: 'กรุณากรอกราคาเป็นตัวเลข' })
      .finite()
      .min(0, 'ราคาต้องไม่ต่ำกว่า 0')
      .max(999999999999.99, 'ราคาสูงเกินกำหนด')
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.001,
        'ราคามีทศนิยมได้ไม่เกิน 2 ตำแหน่ง'
      ),
    supplier: text(200),
    notes: text(4000),
    minimum_stock: z
      .number({ error: 'กรุณากรอกจำนวนเป็นตัวเลข' })
      .int('จำนวนต้องเป็นจำนวนเต็ม')
      .min(0, 'จำนวนต้องไม่ต่ำกว่า 0')
      .max(1000000000, 'จำนวนสูงเกินกำหนด'),
    maximum_stock: z
      .number({ error: 'กรุณากรอก MAX เป็นตัวเลข' })
      .int('MAX ต้องเป็นจำนวนเต็ม')
      .min(0, 'MAX ต้องไม่ต่ำกว่า 0')
      .max(1000000000, 'MAX สูงเกินกำหนด'),
    image: z
      .custom<File>(
        (value) => typeof File !== 'undefined' && value instanceof File,
        'กรุณาเลือกไฟล์รูปภาพ'
      )
      .nullable()
      .refine(
        (file) => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
        'รองรับเฉพาะ JPG, PNG และ WebP'
      )
      .refine(
        (file) => !file || (file.size > 0 && file.size <= 5242880),
        'รูปภาพต้องมีขนาดไม่เกิน 5 MB และไม่เป็นไฟล์ว่าง'
      ),
  })
  .refine(
    (value) =>
      (value.item_type === 'equipment' && value.material_subtype === null) ||
      (value.item_type === 'material' && value.material_subtype === 'consumable'),
    { path: ['material_subtype'], message: 'กรุณาเลือกชนิดวัสดุให้ตรงกับประเภทพัสดุ' }
  )
  .refine((value) => value.maximum_stock === 0 || value.maximum_stock >= value.minimum_stock, {
    message: 'MAX ต้องไม่น้อยกว่า MIN',
    path: ['maximum_stock'],
  });

export type InventoryItemFormValues = z.infer<typeof InventoryItemSchema>;
