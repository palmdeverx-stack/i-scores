import 'server-only';

import type { AppTokenPayload } from 'src/lib/auth-token';

import { supabaseAdmin } from 'src/lib/supabase-admin';

export class SubjectClassificationError extends Error {}

const richText = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, 20000) : null;
};

const shortText = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, 100) : null;
};

export async function parseSubjectClassification(caller: AppTokenPayload, body: Record<string, unknown>) {
  const useSchoolMaster = body.scope === 'school' && Boolean(caller.schoolId);
  let query = supabaseAdmin.from('subject_master_items').select('category, code, parent_code');
  query = useSchoolMaster
    ? query.eq('school_id', caller.schoolId!)
    : query.is('school_id', null);
  const { data, error } = await query;
  if (error) throw error;
  const items = data ?? [];
  const codeFor = (category: string, value: unknown) => {
    if (typeof value !== 'string' || !value) return null;
    const item = items.find((candidate) => candidate.category === category && candidate.code === value);
    if (!item) throw new SubjectClassificationError('ข้อมูลการจัดหมวดหมู่ไม่อยู่ใน Master');
    return item.code;
  };
  const learningArea = codeFor('learning_area', body.learningArea);
  const subjectType = codeFor('subject_type', body.subjectType);
  const educationStage = codeFor('education_stage', body.educationStage);
  const activityType = codeFor('activity_type', body.activityType);
  const gradeItems = (Array.isArray(body.gradeLevels) ? body.gradeLevels : []).map((value) => {
    if (typeof value !== 'string') throw new SubjectClassificationError('ระดับชั้นไม่ถูกต้อง');
    const item = items.find((candidate) => candidate.category === 'grade_level' && candidate.code === value);
    if (!item) throw new SubjectClassificationError('ระดับชั้นไม่อยู่ใน Master');
    return item;
  });
  if (educationStage && gradeItems.some((grade) => grade.parent_code && grade.parent_code !== educationStage)) {
    throw new SubjectClassificationError('ระดับชั้นไม่ตรงกับช่วงชั้นที่เลือก');
  }
  if (activityType && learningArea !== 'student_development_activity') {
    throw new SubjectClassificationError('ประเภทกิจกรรมใช้ได้เฉพาะกลุ่มกิจกรรมพัฒนาผู้เรียน');
  }
  return {
    learningArea,
    activityType,
    subjectType,
    educationStage,
    gradeLevels: [...new Set(gradeItems.map((grade) => grade.code))],
    learningStandardCode: shortText(body.learningStandardCode),
    learningStandards: richText(body.learningStandards),
    learningOutcomes: richText(body.learningOutcomes),
    learningUnits: richText(body.learningUnits),
    indicators: richText(body.indicators),
  };
}
