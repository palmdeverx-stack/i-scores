import * as z from 'zod';

export const learningActivitySchema = z.object({
  activityName: z.string().trim().min(1, 'กรุณากรอกชื่อกิจกรรม').max(500),
  teachingMethod: z.string().trim().max(500).optional(),
  phase: z.enum(['introduction', 'learning', 'practice', 'conclusion']),
  durationMinutes: z.number().int().min(1).max(10000).optional(),
  objectives: z.array(z.string().trim().min(1).max(2000)).max(100),
  teacherActions: z.array(z.string().trim().min(1).max(5000)).max(100),
  studentActions: z.array(z.string().trim().min(1).max(5000)).max(100),
  requiredMaterials: z.array(z.string().trim().min(1).max(2000)).max(100),
  expectedOutputs: z.array(z.string().trim().min(1).max(2000)).max(100),
  groupType: z.enum(['individual', 'pair', 'group', 'whole_class']).optional(),
});
