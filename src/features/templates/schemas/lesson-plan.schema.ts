import * as z from 'zod';

import { templateTypeSchema } from './template-base.schema';

export const lessonPlanTemplateSchema = z.object({
  cover: z
    .object({
      logoUrl: z.union([z.url().max(2000), z.literal('')]).optional(),
      heading: z.string().trim().max(300).optional(),
      learningArea: z.string().trim().max(300).optional(),
      subjectName: z.string().trim().max(300).optional(),
      subjectCode: z.string().trim().max(100).optional(),
      topic: z.string().trim().max(500).optional(),
      teacherName: z.string().trim().max(300).optional(),
      teachingDate: z.string().trim().max(200).optional(),
      gradeLevel: z.string().trim().max(100).optional(),
      semester: z.string().trim().max(100).optional(),
      durationHours: z.number().positive().max(1000).optional(),
      academicYear: z.string().trim().max(100).optional(),
    })
    .optional(),
  evaluationStudents: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().max(300),
      })
    )
    .max(200)
    .optional(),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        sectionType: templateTypeSchema,
        templateId: z.uuid().optional(),
        title: z.string().trim().min(1).max(500),
        order: z.number().int().min(0),
        required: z.boolean(),
        enabled: z.boolean().optional(),
        content: z.unknown().optional(),
      })
    )
    .min(1, 'กรุณาเพิ่ม Section อย่างน้อย 1 รายการ')
    .max(50),
  document: z
    .object({
      curriculumId: z.uuid().nullable(),
      subjectId: z.uuid().nullable(),
      unitId: z.uuid().nullable(),
      gradeLevels: z.array(z.string().trim().min(1).max(100)).max(30),
      indicatorIds: z.array(z.uuid()).max(200),
      learningOutcomeIds: z.array(z.uuid()).max(200),
      sectionOrder: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
      title: z.string().trim().min(1).max(200),
      unitNumber: z.number().int().min(1).max(1000),
      unitName: z.string().trim().max(300),
      durationPeriods: z.number().int().min(1).max(200),
      startDate: z.string().max(20).optional(),
      endDate: z.string().max(20).optional(),
      learningStandards: z.string().max(20000),
      // Legacy combined indicators. New documents use milestoneIndicators and
      // terminalIndicators, but old saved templates may still contain this field.
      indicators: z.string().max(20000).optional(),
      milestoneIndicators: z.string().max(20000),
      terminalIndicators: z.string().max(20000),
      learningObjectives: z.string().max(20000),
      essentialContent: z.string().max(30000),
      learnerCompetencies: z.string().max(30000),
      desiredCharacteristics: z.string().max(30000),
      guidingQuestions: z.string().max(30000),
      learningActivities: z.string().max(50000),
      learningMedia: z.string().max(20000),
      assessment: z.string().max(30000),
    })
    .optional(),
});
