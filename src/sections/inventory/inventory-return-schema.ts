import { z } from 'zod';

const common = {
  id: z.uuid(),
  document_date: z.iso.date({ error: 'กรุณาระบุวันที่คืน' }),
  returned_by: z.string().trim().min(1, 'กรุณาระบุผู้คืน').max(200),
  note: z.string().trim().min(1, 'กรุณาระบุเหตุผลการคืน').max(1000),
};
export const InventoryReturnSchema = z
  .discriminatedUnion('kind', [
    z.object({
      ...common,
      kind: z.literal('material'),
      source_document_id: z.uuid({ error: 'กรุณาเลือกใบเบิกต้นทาง' }),
      lines: z
        .array(z.object({ item_id: z.uuid(), quantity: z.number().int().min(1).max(1000000000) }))
        .min(1)
        .max(100),
    }),
    z.object({
      ...common,
      kind: z.literal('equipment'),
      source_document_id: z.null(),
      lines: z
        .array(
          z.object({
            asset_id: z.uuid(),
            activated_at: z.iso.datetime({ offset: true }),
            condition: z.enum(['good', 'damaged']),
          })
        )
        .min(1)
        .max(100),
    }),
  ])
  .superRefine((value, ctx) => {
    const keys =
      value.kind === 'material'
        ? value.lines.map((line) => line.item_id)
        : value.lines.map((line) => line.asset_id);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: 'custom', path: ['lines'], message: 'รายการคืนซ้ำ' });
  });
export type InventoryReturnValues = z.infer<typeof InventoryReturnSchema>;
