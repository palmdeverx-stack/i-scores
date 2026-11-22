import { z } from 'zod';

import { documentEmailSchema } from './sales-seller-schema';
import { SALES_DOCUMENT_KINDS } from './sales-document-kinds';
import { salesSignatureSchema } from './sales-signature-schema';
import { salesDocumentLogoSchema } from './sales-document-logo-schema';
import { sanitizeSalesDocumentText } from './sales-document-rich-text';

export { SALES_DOCUMENT_LABELS } from './sales-document-kinds';

export const salesDocumentKind = z.enum(SALES_DOCUMENT_KINDS);

const partySchema = z.object({
  name: z.string().trim().max(200),
  address: z.string().trim().max(1000),
  taxId: z.string().trim().max(30),
});

export const salesDocumentContentSchema = z
  .object({
    title: z.string().trim().min(1, 'กรุณาระบุชื่อเรื่อง').max(200),
    seller: partySchema.extend({
      logoUrl: salesDocumentLogoSchema.nullish(),
      signatureImage: salesSignatureSchema.optional(),
      showSignature: z.boolean().optional(),
    }),
    customer: partySchema.extend({ documentEmail: documentEmailSchema }),
    documentDate: z.iso.date(),
    dueDate: z.union([z.iso.date(), z.literal('')]),
    reference: z.string().trim().max(120),
    items: z
      .array(
        z.object({
          description: z.string().trim().min(1, 'กรุณาระบุชื่อสินค้า/บริการ').max(300),
          quantity: z.number().int().min(1).max(10000),
          unitPriceSatang: z.number().int().min(0).max(1000000000),
        })
      )
      .max(50),
    discountSatang: z.number().int().min(0).max(500000000000000),
    taxBasisPoints: z.number().int().min(0).max(10000),
    textFormat: z.literal('html').optional(),
    details: z.string().trim().max(12000).optional(),
    conditions: z.string().trim().max(12000).optional(),
    notes: z.string().trim().max(12000),
  })
  .refine((content) => !content.dueDate || content.dueDate >= content.documentDate, {
    path: ['dueDate'],
    error: 'วันครบกำหนดต้องไม่ก่อนวันที่เอกสาร',
  })
  .refine((content) => content.discountSatang <= salesDocumentSubtotal(content.items), {
    path: ['discountSatang'],
    error: 'ส่วนลดต้องไม่เกินยอดก่อนส่วนลด',
  });

export type SalesDocumentKind = z.infer<typeof salesDocumentKind>;
export type SalesDocumentContent = z.infer<typeof salesDocumentContentSchema>;
export type SalesDocumentDraft = { kind: SalesDocumentKind; content: SalesDocumentContent };
export type SalesDocument = SalesDocumentDraft & {
  id: string;
  status: 'draft' | 'issued';
  document_number: string | null;
  issued_at?: string | null;
  total_satang: number;
  updated_at: string;
};

function salesDocumentSubtotal(items: SalesDocumentContent['items']) {
  return items.reduce((total, item) => total + item.quantity * item.unitPriceSatang, 0);
}

export function salesDocumentTotals(content: SalesDocumentContent) {
  const subtotal = salesDocumentSubtotal(content.items);
  const net = subtotal - content.discountSatang;
  const units = Math.floor(net / 10000);
  const tax =
    units * content.taxBasisPoints + Math.round(((net % 10000) * content.taxBasisPoints) / 10000);
  return { subtotal, tax, total: net + tax };
}

export function canEditSalesDocument(document: Pick<SalesDocument, 'kind' | 'status'>) {
  return document.status === 'draft' || document.kind === 'quotation';
}

export function salesDocumentRequiresItems(kind: SalesDocumentKind) {
  return kind !== 'contract' && kind !== 'other';
}

export const salesDocumentIssueSchema = z
  .object({ kind: salesDocumentKind, content: salesDocumentContentSchema })
  .superRefine(({ kind, content }, context) => {
    if (!content.seller.name) {
      context.addIssue({
        code: 'custom',
        path: ['content', 'seller', 'name'],
        message: 'กรุณากรอกชื่อผู้ขาย',
      });
    }
    if (!content.customer.name) {
      context.addIssue({
        code: 'custom',
        path: ['content', 'customer', 'name'],
        message: 'กรุณากรอกชื่อลูกค้า',
      });
    }
    if (kind === 'contract') {
      const conditions = content.conditions ?? content.notes;
      const text =
        content.textFormat === 'html' ? sanitizeSalesDocumentText(conditions) : conditions;
      if (!text) {
        context.addIssue({
          code: 'custom',
          path: ['content', 'conditions'],
          message: 'กรุณาระบุเงื่อนไขของสัญญา',
        });
      }
    }
    if (salesDocumentRequiresItems(kind) && !content.items.length) {
      context.addIssue({
        code: 'custom',
        path: ['content', 'items'],
        message: 'กรุณาเพิ่มรายการสินค้า/บริการอย่างน้อย 1 รายการ',
      });
    }
  });

export const salesMoney = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
});
