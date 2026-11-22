import type { SalesDocument, SalesDocumentKind } from './sales-document-schema';

import { z } from 'zod';

import { salesDocumentKind, salesDocumentContentSchema } from './sales-document-schema';
import { salesDocumentEditorText, sanitizeSalesDocumentText } from './sales-document-rich-text';

const amountPattern = /^\d+(?:\.\d{1,2})?$/;
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateField = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })], {
    error: 'กรุณาเลือกวันที่ให้ถูกต้อง',
  })
  .transform((value) => value.slice(0, 10));

const amountField = z
  .string()
  .trim()
  .refine((value) => amountPattern.test(value), {
    error: 'กรุณากรอกจำนวนเงินทศนิยมไม่เกิน 2 ตำแหน่ง',
  })
  .transform((value) => Math.round(Number(value) * 100));

const optionalAmount = z
  .literal('')
  .transform(() => 0)
  .or(amountField);
const itemFields = z.object({
  description: salesDocumentContentSchema.shape.items.element.shape.description,
  quantity: z
    .string()
    .trim()
    .regex(/^\d+$/, 'กรุณากรอกจำนวนเป็นจำนวนเต็ม')
    .transform(Number)
    .pipe(z.number().int().min(1, 'จำนวนต้องมากกว่า 0').max(10000)),
  unitPrice: amountField.pipe(z.number().int().max(1000000000, 'ราคาต่อหน่วยสูงเกินกำหนด')),
});

export const salesDocumentFormSchema = z.object({
  kind: salesDocumentKind,
  content: z
    .object({
      ...salesDocumentContentSchema.shape,
      documentDate: dateField,
      dueDate: dateField
        .or(z.literal(''))
        .or(z.null())
        .transform((value) => value ?? ''),
      items: z.array(itemFields).max(50),
      discountSatang: optionalAmount,
      taxBasisPoints: optionalAmount.pipe(z.number().max(10000, 'ภาษีต้องไม่เกิน 100%')),
    })
    .transform(({ items, ...content }) => ({
      ...content,
      ...(content.textFormat === 'html' && {
        details:
          content.details === undefined ? undefined : sanitizeSalesDocumentText(content.details),
        conditions:
          content.conditions === undefined
            ? undefined
            : sanitizeSalesDocumentText(content.conditions),
        notes: sanitizeSalesDocumentText(content.notes),
      }),
      items: items.map(({ description, quantity, unitPrice }) => ({
        description,
        quantity,
        unitPriceSatang: unitPrice,
      })),
    }))
    .pipe(salesDocumentContentSchema),
});

export type SalesDocumentFormValues = z.input<typeof salesDocumentFormSchema>;

export function salesDocumentFormDefaults(
  document?: SalesDocument,
  category?: SalesDocumentKind
): SalesDocumentFormValues {
  const content = document?.content;
  const kind = document?.kind ?? category ?? 'invoice';
  const hasLegacyContractTerms = kind === 'contract' && content && content.conditions === undefined;
  const documentDate = content?.documentDate ?? dayFormat.format(new Date());
  const defaultExpiry = new Date(documentDate);
  defaultExpiry.setUTCDate(defaultExpiry.getUTCDate() + 15);

  return {
    kind,
    content: {
      title: content?.title ?? '',
      seller: content?.seller ?? { name: '', address: '', taxId: '' },
      customer: content?.customer ?? { name: '', address: '', taxId: '' },
      documentDate,
      dueDate: content ? content.dueDate || null : defaultExpiry.toISOString().slice(0, 10),
      reference: content?.reference ?? '',
      textFormat: 'html',
      details: salesDocumentEditorText(content?.details ?? '', content?.textFormat),
      conditions: salesDocumentEditorText(
        content?.conditions ?? (hasLegacyContractTerms ? content.notes : ''),
        content?.textFormat
      ),
      notes: salesDocumentEditorText(
        hasLegacyContractTerms ? '' : (content?.notes ?? ''),
        content?.textFormat
      ),
      items:
        content?.items.map(({ description, quantity, unitPriceSatang }) => ({
          description,
          quantity: String(quantity),
          unitPrice: String(unitPriceSatang / 100),
        })) ?? [],
      discountSatang: String((content?.discountSatang ?? 0) / 100),
      taxBasisPoints: String((content?.taxBasisPoints ?? 0) / 100),
    },
  };
}
