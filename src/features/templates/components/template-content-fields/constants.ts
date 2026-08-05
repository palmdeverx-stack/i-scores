import type { TemplateType } from '../../types';

export const BLOOM_OPTIONS = [
  { value: 'remember', label: 'จำ' },
  { value: 'understand', label: 'เข้าใจ' },
  { value: 'apply', label: 'ประยุกต์ใช้' },
  { value: 'analyze', label: 'วิเคราะห์' },
  { value: 'evaluate', label: 'ประเมินค่า' },
  { value: 'create', label: 'สร้างสรรค์' },
];

export const MEDIA_TYPE_OPTIONS = [
  { value: 'worksheet', label: 'ใบงาน' },
  { value: 'slide', label: 'สไลด์' },
  { value: 'video', label: 'วิดีโอ' },
  { value: 'website', label: 'เว็บไซต์' },
  { value: 'book', label: 'หนังสือ' },
  { value: 'game', label: 'เกมการเรียนรู้' },
  { value: 'quiz', label: 'แบบทดสอบ' },
  { value: 'equipment', label: 'วัสดุหรืออุปกรณ์' },
  { value: 'other', label: 'อื่น ๆ' },
];

export const ASSESSMENT_TYPE_OPTIONS = [
  { value: 'test', label: 'แบบทดสอบ' },
  { value: 'worksheet', label: 'ใบงาน' },
  { value: 'observation', label: 'การสังเกต' },
  { value: 'performance', label: 'การปฏิบัติ' },
  { value: 'project', label: 'โครงงาน' },
  { value: 'presentation', label: 'การนำเสนอ' },
  { value: 'interview', label: 'การสัมภาษณ์' },
  { value: 'portfolio', label: 'แฟ้มสะสมผลงาน' },
];

export const RUBRIC_TYPE_OPTIONS = [
  { value: 'analytic', label: 'แยกองค์ประกอบ' },
  { value: 'holistic', label: 'ภาพรวม' },
  { value: 'checklist', label: 'รายการตรวจสอบ' },
  { value: 'rating_scale', label: 'มาตรประมาณค่า' },
];

export const SCORE_TYPE_OPTIONS = [
  { value: 'score', label: 'คะแนน' },
  { value: 'percentage', label: 'ร้อยละ' },
  { value: 'level', label: 'ระดับคุณภาพ' },
];

export const STRUCTURED_LIST_CONFIG: Partial<
  Record<
    TemplateType,
    {
      title: string;
      itemLabel: string;
      showCode?: boolean;
      showDescription?: boolean;
      compact?: boolean;
    }
  >
> = {
  competency: { title: 'สมรรถนะสำคัญของผู้เรียน', itemLabel: 'สมรรถนะ' },
  desired_characteristic: {
    title: 'คุณลักษณะอันพึงประสงค์',
    itemLabel: 'คุณลักษณะ',
    compact: true,
  },
  learner_development: { title: 'จุดเน้นพัฒนาผู้เรียน', itemLabel: 'จุดเน้น/ทักษะ' },
  learning_task: { title: 'ภาระงานและชิ้นงาน', itemLabel: 'ภาระงาน/ชิ้นงาน' },
};
