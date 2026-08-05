import * as z from 'zod';

export const assessmentSchema = z
  .object({
    assessmentType: z.enum([
      'test',
      'worksheet',
      'observation',
      'performance',
      'project',
      'presentation',
      'interview',
      'portfolio',
    ]),
    method: z.string().trim().min(1, 'กรุณากรอกวิธีประเมิน').max(5000),
    instrument: z.string().trim().min(1, 'กรุณากรอกเครื่องมือ').max(5000),
    evidence: z.string().trim().min(1, 'กรุณากรอกหลักฐาน').max(5000),
    criteria: z.string().trim().min(1, 'กรุณากรอกเกณฑ์').max(5000),
    passingScore: z.number().min(0).optional(),
    maximumScore: z.number().positive().optional(),
    rows: z
      .array(
        z.object({
          objectiveId: z.string().min(1),
          issue: z.string().trim().min(1).max(10000),
          method: z.string().trim().max(10000),
          instrument: z.string().trim().max(10000),
          criteria: z.string().trim().max(10000),
        })
      )
      .max(100)
      .optional(),
  })
  .refine(
    (value) =>
      value.passingScore === undefined ||
      value.maximumScore === undefined ||
      value.passingScore <= value.maximumScore,
    {
      path: ['passingScore'],
      message: 'คะแนนผ่านต้องไม่เกินคะแนนเต็ม',
    }
  );
