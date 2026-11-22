import { z } from 'zod';

import { salesSignatureSchema } from './sales-signature-schema';
import { salesDocumentLogoSchema } from './sales-document-logo-schema';

export type SalesParty = 'seller' | 'customer';

export const salesPartyLabel = { seller: 'ผู้ขาย', customer: 'ลูกค้า' };

export const documentEmailSchema = z
  .string()
  .trim()
  .max(254, 'อีเมลต้องไม่เกิน 254 ตัวอักษร')
  .pipe(z.union([z.literal(''), z.email()], { error: 'กรุณากรอกอีเมลให้ถูกต้อง' }))
  .optional();

export const salesPartySchema = (party: SalesParty) =>
  z.object({
    name: z.string().trim().min(1, `กรุณากรอกชื่อ${salesPartyLabel[party]}`).max(200),
    address: z.string().trim().max(1000, 'ที่อยู่ต้องไม่เกิน 1,000 ตัวอักษร'),
    taxId: z.string().trim().max(30, 'เลขประจำตัวผู้เสียภาษีต้องไม่เกิน 30 ตัวอักษร'),
    isActive: z.boolean(),
    platformLogoUrl: salesDocumentLogoSchema.or(z.literal('')).optional(),
    platformTransparentLogoUrl: salesDocumentLogoSchema.or(z.literal('')).optional(),
    signatureImage: salesSignatureSchema.optional(),
    documentEmail: documentEmailSchema,
    schoolId: z.uuid().nullable().optional(),
  });

export type SalesSellerInput = z.infer<ReturnType<typeof salesPartySchema>>;
