import * as z from 'zod';

export const SignInSchema = z.object({
  username: z.string().min(1, { error: 'กรุณากรอกชื่อผู้ใช้งาน!' }),
  password: z
    .string()
    .min(1, { error: 'กรุณากรอกรหัสผ่าน!' })
    .min(6, { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!' }),
  pin: z.string().refine((value) => value === '' || /^\d{8}$/.test(value), {
    error: 'PIN ต้องเป็นตัวเลข 8 หลัก',
  }),
});

export const SignInPinSchema = z.object({
  username: z.string(),
  password: z.string(),
  pin: z.string().regex(/^\d{8}$/, { error: 'PIN ต้องเป็นตัวเลข 8 หลัก' }),
});

export type SignInSchemaType = z.infer<typeof SignInSchema>;
