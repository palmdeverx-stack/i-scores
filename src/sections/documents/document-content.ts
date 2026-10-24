import type { SchoolDocumentTemplate } from './document-catalog';

import { z } from 'zod';

const text = (max: number) => z.string().max(max);
export const DocumentContentSchema = z.object({
  version: z.literal(1),
  schoolName: text(200),
  department: text(300),
  documentNumber: text(130),
  documentDate: z.union([z.iso.date(), z.literal('')]),
  subject: text(200),
  recipient: text(300),
  body: text(20000),
  authorName: text(200),
  authorPosition: text(200),
  reviewText: text(4000),
  approverName: text(200),
  approverPosition: text(200),
  sections: z.array(z.object({ title: text(200), text: text(6000) })).max(30),
});
export type DocumentContent = z.infer<typeof DocumentContentSchema>;
export function templateDocumentContent(
  template: SchoolDocumentTemplate,
  schoolName = '',
  documentPrefix = '',
  authorName = '',
  today = ''
): DocumentContent {
  const memo = template.slug === 'memo';
  return {
    version: 1,
    schoolName,
    department: schoolName ? `${schoolName} งานวิชาการ` : 'งานวิชาการ',
    documentNumber: documentPrefix ? `${documentPrefix}/` : '',
    documentDate: today,
    subject: memo ? 'ขออนุมัติจัดกิจกรรมส่งเสริมการเรียนรู้' : template.name,
    recipient: schoolName ? `ผู้อำนวยการ${schoolName}` : 'ผู้อำนวยการโรงเรียน',
    body: memo
      ? 'ด้วยงานวิชาการมีความประสงค์จะจัดกิจกรรมส่งเสริมการเรียนรู้ เพื่อพัฒนาทักษะและประสบการณ์ของนักเรียนให้สอดคล้องกับแผนการจัดการเรียนรู้ของโรงเรียน\n\nในการนี้ ขออนุมัติจัดกิจกรรมดังกล่าว โดยมีครูผู้รับผิดชอบและนักเรียนเข้าร่วมตามรายละเอียดที่แนบมาพร้อมบันทึกข้อความนี้\n\nจึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ'
      : '',
    authorName,
    authorPosition: 'ครู',
    reviewText: '',
    approverName: '',
    approverPosition: 'ผู้อำนวยการโรงเรียน',
    sections: memo
      ? []
      : template.sections.map((title) => ({
          title,
          text: 'ข้อมูลตัวอย่าง ........................................................................\nรายละเอียด ............................................................................',
        })),
  };
}
