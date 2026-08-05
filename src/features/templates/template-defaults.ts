import type { TemplateType, TemplateContent } from './types';

import {
  TEMPLATE_TYPE_LABELS,
  LESSON_PLAN_SECTION_TYPES,
  OPTIONAL_EVALUATION_TEMPLATE_TYPES,
} from './constants';

function uid() {
  return crypto.randomUUID();
}

export function defaultTemplateContent(type: TemplateType): TemplateContent {
  if (type === 'learning_standard')
    return {
      items: [{ id: uid(), code: '', title: '', description: '' }],
      milestoneIndicators: [{ id: uid(), code: '', title: '', description: '' }],
      terminalIndicators: [{ id: uid(), code: '', title: '', description: '' }],
    };
  if (
    ['competency', 'desired_characteristic', 'learner_development', 'learning_task'].includes(type)
  )
    return { items: [{ id: uid(), code: '', title: '', description: '' }] };
  if (type === 'learning_objective')
    return {
      description: '',
      domain: 'knowledge',
      behaviorVerb: '',
      condition: '',
      expectedResult: '',
      successCriteria: '',
      objectives: [
        {
          id: uid(),
          description: '',
          domain: 'knowledge',
          behaviorVerb: '',
          condition: '',
          expectedResult: '',
          successCriteria: '',
        },
      ],
    };
  if (type === 'essential_content') return { content: '', keyConcepts: [] };
  if (type === 'learning_content')
    return { topics: [{ id: uid(), title: '', description: '', order: 0 }] };
  if (type === 'learning_activity') return { items: [{ id: uid(), title: '', description: '' }] };
  if (type === 'assessment')
    return {
      assessmentType: 'observation',
      method: '',
      instrument: '',
      evidence: '',
      criteria: '',
      passingScore: 0,
      maximumScore: 10,
      rows: [],
    };
  if (type === 'rubric')
    return {
      rubricType: 'analytic',
      scoreType: 'score',
      maximumScore: 4,
      passingScore: 2,
      criteria: [
        {
          id: uid(),
          name: '',
          description: '',
          weight: 100,
          levels: [{ id: uid(), level: 1, label: 'ผ่าน', score: 1, description: '' }],
        },
      ],
    };
  if (type === 'media')
    return {
      items: [
        {
          id: uid(),
          mediaType: 'worksheet',
          title: '',
          description: '',
          url: '',
          marketplaceProductId: '',
          usageInstructions: '',
        },
      ],
    };
  if (type === 'question')
    return {
      questions: [
        {
          id: uid(),
          question: '',
          bloomLevel: 'understand',
          expectedAnswer: '',
          followUpQuestions: [],
        },
      ],
    };
  if (type === 'reflection')
    return {
      sections: [],
      specialStudents: [],
      knowledgeResult: '',
      processResult: '',
      attitudeResult: '',
      problems: '',
      solutions: '',
    };
  if (type === 'worksheet_assessment_record')
    return {
      title: 'แบบบันทึกผลการประเมินใบงาน',
      topic: '',
      scoreColumns: [
        { id: uid(), title: 'การตอบคำถาม', maximumScore: 4 },
        { id: uid(), title: 'ความเรียบร้อย', maximumScore: 4 },
        { id: uid(), title: 'ความตรงต่อเวลา', maximumScore: 4 },
      ],
      students: [{ id: uid(), name: '', scores: [0, 0, 0], result: '' }],
      rubricCriteria: [
        {
          id: uid(),
          title: 'การตอบคำถามจากเรื่องที่อ่านหรือเทคนิค',
          levels: [
            { level: 4, label: 'ดีมาก', description: 'ตอบคำถามได้ถูกต้องครบถ้วนสมบูรณ์' },
            { level: 3, label: 'ดี', description: 'ตอบคำถามได้ถูกต้องครบถ้วนเป็นส่วนใหญ่' },
            { level: 2, label: 'พอใช้', description: 'ตอบคำถามได้ถูกต้องบางส่วน' },
            { level: 1, label: 'ปรับปรุง', description: 'ตอบคำถามได้ถูกต้องบางส่วนน้อยกว่า 3 ข้อ' },
          ],
        },
        {
          id: uid(),
          title: 'ความเรียบร้อยสวยงาม',
          levels: [
            {
              level: 4,
              label: 'ดีมาก',
              description: 'เขียนได้เรียบร้อยสวยงามทั้งหมด ระบายสีอยู่ในกรอบ',
            },
            {
              level: 3,
              label: 'ดี',
              description: 'เขียนได้เรียบร้อยสวยงามเป็นส่วนใหญ่ ระบายสีอยู่ในกรอบเป็นส่วนใหญ่',
            },
            { level: 2, label: 'พอใช้', description: 'เขียนไม่เรียบร้อย ระบายสีไม่อยู่ในกรอบ' },
            { level: 1, label: 'ปรับปรุง', description: 'เขียนผิดหรือไม่เขียน ไม่ระบายสี' },
          ],
        },
        {
          id: uid(),
          title: 'ความตรงต่อเวลา',
          levels: [
            { level: 4, label: 'ดีมาก', description: 'ส่งงานได้ตรงตามเวลาที่กำหนด' },
            { level: 3, label: 'ดี', description: 'ส่งงานช้ากว่ากำหนด 1 วัน' },
            { level: 2, label: 'พอใช้', description: 'ส่งงานช้ากว่ากำหนด 2 วัน' },
            { level: 1, label: 'ปรับปรุง', description: 'ส่งงานช้ากว่ากำหนด 3 วันขึ้นไป' },
          ],
        },
      ],
      passingScore: 8,
      passingCriteria: 'ผู้เรียนได้ระดับ 2 ขึ้นไปอย่างน้อย 2 รายการ จึงถือว่าผ่านการประเมิน',
      evaluatorName: '',
      evaluatorRole: 'ผู้ประเมิน',
      evaluationDate: '',
    };
  if (type === 'desired_characteristic_assessment')
    return {
      title: 'แบบประเมินคุณลักษณะอันพึงประสงค์',
      instructions: 'ให้ผู้สอนสังเกตพฤติกรรมระหว่างเรียน แล้วทำเครื่องหมาย ✓ ลงในช่องคะแนน',
      characteristicGroups: [
        {
          id: uid(),
          title: 'มุ่งมั่นในการทำงาน',
          behaviors: [
            { id: uid(), title: 'ตั้งใจและรับผิดชอบในการปฏิบัติหน้าที่การงาน' },
            { id: uid(), title: 'ทำงานด้วยความเพียรพยายามและอดทน' },
          ],
        },
        {
          id: uid(),
          title: 'ใฝ่เรียนรู้',
          behaviors: [
            { id: uid(), title: 'ตั้งใจเรียน' },
            { id: uid(), title: 'เอาใจใส่และมีความเพียรพยายามในการเรียนรู้' },
            { id: uid(), title: 'แลกเปลี่ยนเรียนรู้ด้วยวิธีการต่าง ๆ และนำไปใช้ในชีวิตประจำวัน' },
          ],
        },
      ],
      students: [{ id: uid(), name: '', scores: [0, 0, 0, 0, 0] }],
      qualityLevels: [
        { id: uid(), minimumScore: 13, maximumScore: 15, label: 'ดีมาก' },
        { id: uid(), minimumScore: 10, maximumScore: 12, label: 'ดี' },
        { id: uid(), minimumScore: 7, maximumScore: 9, label: 'พอใช้' },
        { id: uid(), minimumScore: 0, maximumScore: 6, label: 'ควรปรับปรุง' },
      ],
      passingScore: 10,
      passingNote: 'ผู้เรียนได้ระดับคุณภาพ “ดี” ขึ้นไป จึงถือว่าผ่าน',
      evaluatorName: '',
      evaluatorRole: 'ผู้ประเมิน',
      evaluationDate: '',
    };
  if (type === 'competency_assessment')
    return {
      title: 'แบบประเมินสมรรถนะสำคัญของผู้เรียน',
      instructions: 'ให้ผู้สอนสังเกตพฤติกรรมระหว่างเรียน แล้วทำเครื่องหมาย ✓ ลงในช่องคะแนน',
      domains: [
        { id: uid(), title: 'ด้านการคิด', competencyLabel: 'ด้านความสามารถในการคิด' },
        { id: uid(), title: 'ด้านการสื่อสาร', competencyLabel: 'ด้านความสามารถในการสื่อสาร' },
        {
          id: uid(),
          title: 'ด้านการใช้เทคโนโลยี',
          competencyLabel: 'ด้านความสามารถในการใช้เทคโนโลยี',
        },
      ],
      students: [{ id: uid(), name: '', scores: [0, 0, 0] }],
      qualityLevels: [
        { id: uid(), score: 3, label: 'ดีมาก' },
        { id: uid(), score: 2, label: 'ดี' },
        { id: uid(), score: 1, label: 'พอใช้' },
        { id: uid(), score: 0, label: 'ปรับปรุง' },
      ],
      passingScore: 2,
      passingNote: 'ได้รับระดับคุณภาพ “ดี” ขึ้นไปถือว่าผ่าน',
      evaluatorName: '',
      evaluatorRole: 'ผู้ประเมิน',
      evaluationDate: '',
    };
  if (type === 'behavior_observation')
    return {
      title: 'แบบสังเกตพฤติกรรมด้านคุณลักษณะ เจตคติ ค่านิยม (A)',
      instructions: 'ให้ผู้สอนสังเกตพฤติกรรมระหว่างเรียน แล้วทำเครื่องหมาย ✓ ลงในช่องรายการประเมิน',
      behaviors: [
        { id: uid(), title: 'ตั้งใจฟังครูผู้สอน' },
        { id: uid(), title: 'ให้ความร่วมมือในการทำกิจกรรม' },
        { id: uid(), title: 'การตั้งใจทำงานกลุ่ม' },
        { id: uid(), title: 'กล้าแสดงความคิดที่เห็น' },
      ],
      students: [{ id: uid(), name: '', observations: [false, false, false, false] }],
      passingMinimum: 3,
      passingNote: 'ผ่าน 3 รายการขึ้นไป หมายถึง ผ่าน; ผ่าน 0–2 รายการ หมายถึง ไม่ผ่าน',
      evaluatorName: '',
      evaluatorRole: 'ผู้ประเมิน',
      evaluationDate: '',
    };
  return {
    cover: {
      logoUrl: '',
      learningArea: '',
      subjectName: '',
      subjectCode: '',
      topic: '',
      teacherName: '',
      teachingDate: '',
      gradeLevel: '',
      semester: '',
      durationHours: undefined,
      academicYear: '',
    },
    evaluationStudents: [{ id: uid(), name: '' }],
    sections: LESSON_PLAN_SECTION_TYPES.map((section, order) => ({
      id: uid(),
      sectionType: section.value,
      title: TEMPLATE_TYPE_LABELS[section.value],
      order,
      required: true,
      enabled: !OPTIONAL_EVALUATION_TEMPLATE_TYPES.includes(section.value),
      content: defaultTemplateContent(section.value),
    })),
  };
}
