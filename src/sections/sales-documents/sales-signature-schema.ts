import { z } from 'zod';

export const SALES_SIGNATURE_MAX_BYTES = 256 * 1024;

export const salesSignatureSchema = z
  .string()
  .max(24 + Math.ceil(SALES_SIGNATURE_MAX_BYTES / 3) * 4)
  .refine((value) => {
    if (!value) return true;
    const image = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!image) return false;
    const [, type, data] = image;
    const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
    return (
      data.length % 4 === 0 &&
      (data.length / 4) * 3 - padding <= SALES_SIGNATURE_MAX_BYTES &&
      data.startsWith(type === 'png' ? 'iVBORw0KGgo' : '/9j/')
    );
  }, 'ลายเซ็นต้องเป็นไฟล์ PNG หรือ JPEG ขนาดไม่เกิน 256 KB');

export const salesSignatureInputSchema = z.object({ signatureImage: salesSignatureSchema });
