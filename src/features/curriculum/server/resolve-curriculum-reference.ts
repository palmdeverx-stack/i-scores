import 'server-only';

import type { CurriculumReference } from '../types';
import type { AppTokenPayload } from 'src/lib/auth-token';

import { getVisibleSubject } from 'src/features/subject-catalog/server/subject-catalog-service';

export class CurriculumReferenceError extends Error {}

export async function resolveCurriculumReference(
  caller: AppTokenPayload,
  input: CurriculumReference,
  requiredSubjectId?: string
) {
  const subjectId = requiredSubjectId ?? input.subjectId;
  if (!subjectId) {
    if (input.indicatorIds.length || input.learningOutcomeIds.length || input.unitId)
      throw new CurriculumReferenceError('ต้องเลือกรายวิชาก่อนเลือกข้อมูลหลักสูตร');
    return {
      curriculumId: null,
      subjectId: null,
      unitId: null,
      gradeLevels: input.gradeLevels,
      indicatorIds: [],
      learningOutcomeIds: [],
    };
  }

  if (input.subjectId && input.subjectId !== subjectId) {
    throw new CurriculumReferenceError('รายวิชาที่อ้างอิงไม่ตรงกับรายวิชาที่เลือก');
  }

  const subject = await getVisibleSubject(caller, subjectId);
  if (!subject) throw new CurriculumReferenceError('ไม่พบรายวิชาที่อ้างอิง');
  if (input.curriculumId && input.curriculumId !== subject.curriculum_id) {
    throw new CurriculumReferenceError('หลักสูตรที่อ้างอิงไม่ตรงกับรายวิชา');
  }

  const allowedIds = new Set(subject.indicators.map((indicator) => indicator.id));
  if (input.indicatorIds.some((id) => !allowedIds.has(id))) {
    throw new CurriculumReferenceError('มีตัวชี้วัดที่ไม่อยู่ในรายวิชาที่เลือก');
  }
  const allowedOutcomeIds = new Set(subject.learning_outcomes_structured.map((item) => item.id));
  if (input.learningOutcomeIds.some((id) => !allowedOutcomeIds.has(id))) {
    throw new CurriculumReferenceError('มีผลลัพธ์การเรียนรู้ที่ไม่อยู่ในรายวิชา');
  }
  if (input.unitId && !subject.learning_units_structured.some((unit) => unit.id === input.unitId)) {
    throw new CurriculumReferenceError('หน่วยการเรียนรู้ไม่อยู่ในรายวิชาที่เลือก');
  }

  return {
    curriculumId: subject.curriculum_id,
    subjectId,
    unitId: input.unitId,
    gradeLevels: [...new Set(input.gradeLevels)],
    indicatorIds: [...new Set(input.indicatorIds)],
    learningOutcomeIds: [...new Set(input.learningOutcomeIds)],
  };
}
