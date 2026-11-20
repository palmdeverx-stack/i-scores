import * as z from 'zod';

export const ENROLLMENT_IMPORT_LIMIT = 200;

export const enrollmentImportRowSchema = z.object({
  row: z.number().int().min(2),
  studentCode: z.string().trim().min(1, 'กรุณากรอกรหัสนักเรียน').max(64),
  classroomName: z.string().trim().min(1, 'กรุณากรอกชื่อห้องเรียน').max(200),
  studentNumber: z.string().trim().max(32),
});

export const enrollmentImportSchema = z.object({
  academicYearId: z.uuid(),
  rows: z.array(enrollmentImportRowSchema).min(1).max(ENROLLMENT_IMPORT_LIMIT),
});

export type EnrollmentImportRow = z.infer<typeof enrollmentImportRowSchema>;
