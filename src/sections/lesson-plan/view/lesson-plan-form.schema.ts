import * as z from 'zod';
import dayjs from 'dayjs';

import { curriculumReferenceShape } from 'src/features/curriculum/schema';

import {
  serializeAssessment,
  serializeIndicators,
  richTextToPlainText,
} from '../lesson-plan-content';

// ----------------------------------------------------------------------

const optionalDate = z
  .string()
  .nullable()
  .refine((value) => !value || dayjs(value).isValid(), { error: 'วันที่ไม่ถูกต้อง' });

const requiredRichText = (message: string, max: number) =>
  z
    .string()
    .max(max, { error: 'ข้อมูลยาวเกินกำหนด' })
    .refine((value) => Boolean(richTextToPlainText(value)), { error: message });

const indicatorsSchema = z
  .array(
    z.object({
      code: z.string().trim().min(1, { error: 'กรุณากรอกรหัสตัวชี้วัด' }),
      description: z.string().trim().min(1, { error: 'กรุณากรอกรายละเอียดตัวชี้วัด' }),
    })
  )
  .min(1, { error: 'กรุณาเพิ่มตัวชี้วัดอย่างน้อย 1 รายการ' })
  .refine((rows) => serializeIndicators(rows).length <= 20000, {
    error: 'ข้อมูลยาวเกินกำหนด',
  });

export const EMPTY_GROUP_LABEL = 'หมวดหมู่ใหม่';
export const EMPTY_GROUP_CODE = '-';

export function serializeObjectives(
  groups: Array<{ code: string; label: string; items: string[] }>
) {
  return groups
    .flatMap(({ code, label, items }) => {
      const heading = `${label || EMPTY_GROUP_LABEL}\t(${code || EMPTY_GROUP_CODE})`;
      return [heading, ...items.map((item, index) => `${index + 1}. ${item}`)];
    })
    .join('\n');
}

export function serializeObjectiveFormGroups(
  groups: Array<{ code: string; label: string; items: Array<{ content: string }> }>
) {
  return serializeObjectives(
    groups.map((group) => ({
      code: group.code,
      label: group.label,
      items: group.items.map((item) => item.content),
    }))
  );
}

export const LessonPlanSchema = z
  .object({
    ...curriculumReferenceShape,
    teacherAssignmentId: z.string().uuid({ error: 'กรุณาเลือกรายวิชาและห้องเรียน' }),
    title: z
      .string()
      .trim()
      .min(1, { error: 'กรุณากรอกชื่อแผนการสอน' })
      .max(200, { error: 'ชื่อแผนการสอนต้องไม่เกิน 200 ตัวอักษร' }),
    unitNumber: z
      .number({ error: 'กรุณาระบุหน่วยที่' })
      .int({ error: 'หน่วยต้องเป็นจำนวนเต็ม' })
      .min(1, { error: 'หน่วยต้องเริ่มจาก 1' }),
    unitName: z
      .string()
      .trim()
      .min(1, { error: 'กรุณากรอกชื่อหน่วยการเรียนรู้' })
      .max(300, { error: 'ชื่อหน่วยต้องไม่เกิน 300 ตัวอักษร' }),
    durationPeriods: z
      .number({ error: 'กรุณาระบุจำนวนคาบ' })
      .int({ error: 'จำนวนคาบต้องเป็นจำนวนเต็ม' })
      .min(1, { error: 'จำนวนคาบต้องอย่างน้อย 1 คาบ' })
      .max(200, { error: 'จำนวนคาบต้องไม่เกิน 200 คาบ' }),
    startDate: optionalDate,
    endDate: optionalDate,
    learningStandards: z
      .array(
        z.object({
          content: z.string().trim().min(1, { error: 'กรุณากรอกมาตรฐานการเรียนรู้' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มมาตรฐานการเรียนรู้อย่างน้อย 1 รายการ' })
      .refine((rows) => rows.map((row) => row.content).join('\n').length <= 20000, {
        error: 'ข้อมูลยาวเกินกำหนด',
      }),
    milestoneIndicators: indicatorsSchema,
    terminalIndicators: indicatorsSchema,
    learningObjectives: z
      .array(
        z.object({
          label: z.string().trim().min(1, { error: 'กรุณาระบุชื่อด้าน' }),
          code: z.string().trim(),
          items: z
            .array(
              z.object({
                content: z.string().trim().min(1, { error: 'กรุณากรอกจุดประสงค์การเรียนรู้' }),
              })
            )
            .min(1, { error: 'กรุณาเพิ่มจุดประสงค์การเรียนรู้อย่างน้อย 1 รายการ' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มด้านของจุดประสงค์การเรียนรู้อย่างน้อย 1 ด้าน' })
      .refine((groups) => serializeObjectiveFormGroups(groups).length <= 20000, {
        error: 'ข้อมูลยาวเกินกำหนด',
      }),
    essentialContent: requiredRichText('กรุณากรอกสาระสำคัญ', 30000),
    learnerCompetencies: requiredRichText('กรุณากรอกสมรรถนะสำคัญของผู้เรียน', 30000),
    desiredCharacteristics: requiredRichText('กรุณากรอกคุณลักษณะอันพึงประสงค์', 30000),
    guidingQuestions: requiredRichText('กรุณากรอกคำถามหลัก', 30000),
    learningActivities: z
      .array(
        z.object({
          title: z.string().trim().min(1, { error: 'กรุณากรอกหัวข้อกิจกรรม' }),
          description: z
            .string()
            .max(50000, { error: 'ข้อมูลยาวเกินกำหนด' })
            .refine((value) => Boolean(richTextToPlainText(value)), {
              error: 'กรุณากรอกรายละเอียดกิจกรรม',
            }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มกิจกรรมอย่างน้อย 1 รายการ' }),
    learningMedia: z
      .array(
        z.object({
          content: z
            .string()
            .trim()
            .min(1, { error: 'กรุณากรอกสื่อหรือแหล่งเรียนรู้' })
            .max(2000, { error: 'รายการยาวเกินกำหนด' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มสื่อหรือแหล่งเรียนรู้อย่างน้อย 1 รายการ' })
      .max(100, { error: 'เพิ่มสื่อได้ไม่เกิน 100 รายการ' }),
    assessment: z
      .array(
        z.object({
          issue: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุประเด็นการประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
          method: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุวิธีการประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
          tool: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุเครื่องมือการประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
          criteria: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุเกณฑ์การประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มการประเมินอย่างน้อย 1 รายการ' })
      .max(50, { error: 'เพิ่มการประเมินได้ไม่เกิน 50 รายการ' })
      .refine((rows) => serializeAssessment(rows).length <= 30000, {
        error: 'ข้อมูลการประเมินรวมยาวเกินกำหนด',
      }),
    evaluationStudents: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().max(300),
        })
      )
      .max(200)
      .default([]),
    templateSectionContents: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((values, context) => {
    if (
      values.startDate &&
      values.endDate &&
      dayjs(values.endDate).startOf('day').isBefore(dayjs(values.startDate).startOf('day'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มใช้',
      });
    }
  });

export const TemplateLessonPlanSchema = LessonPlanSchema.safeExtend({
  teacherAssignmentId: z.string(),
  unitName: z.string().trim().max(300),
  learningStandards: z.any(),
  milestoneIndicators: z.any(),
  terminalIndicators: z.any(),
  learningObjectives: z.any(),
  essentialContent: z.any(),
  learnerCompetencies: z.any(),
  desiredCharacteristics: z.any(),
  guidingQuestions: z.any(),
  learningActivities: z.any(),
  learningMedia: z.any(),
  assessment: z.any(),
});

export type LessonPlanFormValues = z.infer<typeof LessonPlanSchema>;

export type LearningMediaItem = LessonPlanFormValues['learningMedia'][number];

export type SerializedObjectiveGroup = {
  code: string;
  label: string;
  items: string[];
};

export type LessonPlanNavigationSection = {
  id: string;
  label: string;
  complete: boolean;
};

export const TAB_FORM_FIELDS: Record<string, Array<keyof LessonPlanFormValues>> = {
  'lesson-plan-general': [
    'teacherAssignmentId',
    'title',
    'unitNumber',
    'unitName',
    'durationPeriods',
    'startDate',
    'endDate',
  ],
  'lesson-plan-standards': [
    'subjectId',
    'indicatorIds',
    'learningStandards',
    'milestoneIndicators',
    'terminalIndicators',
  ],
  'lesson-plan-objectives': ['learningObjectives'],
  'lesson-plan-essential': ['essentialContent'],
  'lesson-plan-characteristics': ['desiredCharacteristics'],
  'lesson-plan-competencies': ['learnerCompetencies'],
  'lesson-plan-questions': ['guidingQuestions'],
  'lesson-plan-activities': ['learningActivities'],
  'lesson-plan-media': ['learningMedia'],
  'lesson-plan-assessment': ['assessment'],
  'lesson-plan-reflection': [],
  'lesson-plan-worksheet-assessment-record': [],
  'lesson-plan-desired-characteristic-assessment': [],
  'lesson-plan-competency-assessment': [],
  'lesson-plan-behavior-observation': [],
};

export const DEFAULT_TAB_ORDER = Object.keys(TAB_FORM_FIELDS);
export const EVALUATION_TAB_IDS = [
  'lesson-plan-worksheet-assessment-record',
  'lesson-plan-desired-characteristic-assessment',
  'lesson-plan-competency-assessment',
  'lesson-plan-behavior-observation',
] as const;
export const TAB_ORDER_STORAGE_KEY = 'lesson-plan-tab-order';
export const TEMPLATE_LOGO_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};
export const TEMPLATE_LOGO_MAX_SIZE = 2 * 1024 * 1024;

export const TAB_TEMPLATE_TYPES = {
  'lesson-plan-standards': 'learning_standard',
  'lesson-plan-objectives': 'learning_objective',
  'lesson-plan-essential': 'essential_content',
  'lesson-plan-characteristics': 'desired_characteristic',
  'lesson-plan-competencies': 'competency',
  'lesson-plan-questions': 'question',
  'lesson-plan-activities': 'learning_activity',
  'lesson-plan-media': 'media',
  'lesson-plan-assessment': 'assessment',
  'lesson-plan-reflection': 'reflection',
  'lesson-plan-worksheet-assessment-record': 'worksheet_assessment_record',
  'lesson-plan-desired-characteristic-assessment': 'desired_characteristic_assessment',
  'lesson-plan-competency-assessment': 'competency_assessment',
  'lesson-plan-behavior-observation': 'behavior_observation',
} as const;

export const TAB_LABELS: Record<string, string> = {
  'lesson-plan-general': 'ข้อมูลทั่วไป',
  'lesson-plan-standards': 'มาตรฐานและตัวชี้วัด',
  'lesson-plan-objectives': 'จุดประสงค์การเรียนรู้',
  'lesson-plan-essential': 'สาระสำคัญ',
  'lesson-plan-characteristics': 'คุณลักษณะอันพึงประสงค์',
  'lesson-plan-competencies': 'สมรรถนะสำคัญ',
  'lesson-plan-questions': 'คำถามหลัก',
  'lesson-plan-activities': 'กิจกรรมการเรียนรู้',
  'lesson-plan-media': 'สื่อและแหล่งเรียนรู้',
  'lesson-plan-assessment': 'การวัดและประเมินผล',
  'lesson-plan-reflection': 'บันทึกผลหลังการสอน',
  'lesson-plan-worksheet-assessment-record': 'บันทึกผลการประเมินใบงาน',
  'lesson-plan-desired-characteristic-assessment': 'แบบประเมินคุณลักษณะอันพึงประสงค์',
  'lesson-plan-competency-assessment': 'แบบประเมินสมรรถนะสำคัญของผู้เรียน',
  'lesson-plan-behavior-observation': 'แบบสังเกตพฤติกรรม',
};

export const EMPTY_FORM: LessonPlanFormValues = {
  curriculumId: null,
  subjectId: null,
  unitId: null,
  gradeLevels: [],
  indicatorIds: [],
  learningOutcomeIds: [],
  teacherAssignmentId: '',
  title: '',
  unitNumber: 1,
  unitName: '',
  durationPeriods: 1,
  startDate: null,
  endDate: null,
  learningStandards: [{ content: '' }],
  milestoneIndicators: [{ code: '', description: '' }],
  terminalIndicators: [{ code: '', description: '' }],
  learningObjectives: [{ label: '', code: '', items: [{ content: '' }] }],
  essentialContent: '',
  learnerCompetencies: '',
  desiredCharacteristics: '',
  guidingQuestions: '',
  learningActivities: [{ title: '', description: '' }],
  learningMedia: [{ content: '' }],
  assessment: [],
  evaluationStudents: [{ id: 'evaluation-student-1', name: '' }],
  templateSectionContents: {},
};
