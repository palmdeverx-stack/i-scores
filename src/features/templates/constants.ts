import type { TemplateType, TemplateScope, TemplateStatus } from './types';

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  learning_standard: 'มาตรฐานการเรียนรู้และตัวชี้วัด',
  learning_objective: 'จุดประสงค์การเรียนรู้',
  essential_content: 'สาระสำคัญ',
  learning_content: 'สาระการเรียนรู้',
  learning_activity: 'กิจกรรมการเรียนรู้',
  assessment: 'การวัดและประเมินผล',
  rubric: 'รูบริก',
  media: 'สื่อและแหล่งเรียนรู้',
  question: 'คำถามกระตุ้นคิด',
  reflection: 'บันทึกหลังสอน',
  worksheet_assessment_record: 'บันทึกผลการประเมินใบงาน',
  competency: 'สมรรถนะสำคัญของผู้เรียน',
  competency_assessment: 'แบบประเมินสมรรถนะสำคัญของผู้เรียน',
  behavior_observation: 'แบบสังเกตพฤติกรรม',
  desired_characteristic: 'คุณลักษณะอันพึงประสงค์',
  desired_characteristic_assessment: 'แบบประเมินคุณลักษณะอันพึงประสงค์',
  learner_development: 'จุดเน้นพัฒนาผู้เรียน',
  learning_task: 'ภาระงานและชิ้นงาน',
  lesson_plan: 'แผนการสอนทั้งฉบับ',
};

export const TEMPLATE_SCOPE_LABELS: Record<TemplateScope, string> = {
  personal: 'ส่วนตัว',
  school: 'โรงเรียน',
  system: 'ระบบ',
  marketplace: 'Marketplace',
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: 'ฉบับร่าง',
  active: 'ใช้งาน',
  archived: 'เก็บถาวร',
};

export const TEMPLATE_TYPES = Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => ({
  value: value as TemplateType,
  label,
}));

export const LESSON_PLAN_SECTION_TYPES = TEMPLATE_TYPES.filter(
  (option) => option.value !== 'lesson_plan'
);

export const OPTIONAL_EVALUATION_TEMPLATE_TYPES: TemplateType[] = [
  'worksheet_assessment_record',
  'desired_characteristic_assessment',
  'competency_assessment',
  'behavior_observation',
];

export const GRADE_LEVELS = [
  'อนุบาล 1',
  'อนุบาล 2',
  'อนุบาล 3',
  'ประถมศึกษาปีที่ 1',
  'ประถมศึกษาปีที่ 2',
  'ประถมศึกษาปีที่ 3',
  'ประถมศึกษาปีที่ 4',
  'ประถมศึกษาปีที่ 5',
  'ประถมศึกษาปีที่ 6',
  'มัธยมศึกษาปีที่ 1',
  'มัธยมศึกษาปีที่ 2',
  'มัธยมศึกษาปีที่ 3',
  'มัธยมศึกษาปีที่ 4',
  'มัธยมศึกษาปีที่ 5',
  'มัธยมศึกษาปีที่ 6',
];
