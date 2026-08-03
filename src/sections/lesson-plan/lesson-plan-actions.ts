'use client';

// ----------------------------------------------------------------------

export type LessonPlanStatus = 'draft' | 'submitted' | 'revision' | 'approved' | 'archived';

export type Person = {
  id?: string;
  first_name: string | null;
  last_name: string | null;
  username?: string;
} | null;

export type LessonPlanAssignment = {
  id: string;
  teacher_id?: string;
  subject: {
    id: string;
    code: string | null;
    name: string;
    description?: string | null;
    learning_standards?: string | null;
    learning_outcomes?: string | null;
    indicators?: string | null;
    learning_units?: string | null;
  } | null;
  classroom: {
    id: string;
    name: string;
    grade_level: string | null;
    academic_year: { year: string } | null;
  } | null;
  semester: { id: string; name: string } | null;
};

export type LessonPlan = {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_assignment_id: string;
  copied_from_id: string | null;
  title: string;
  unit_number: number;
  unit_name: string;
  duration_periods: number;
  start_date: string | null;
  end_date: string | null;
  learning_standards: string | null;
  indicators: string | null;
  learning_objectives: string | null;
  essential_content: string | null;
  learner_competencies: string | null;
  desired_characteristics: string | null;
  guiding_questions: string | null;
  learning_activities: string | null;
  learning_media: string | null;
  assessment: string | null;
  saved_tabs: string[];
  status: LessonPlanStatus;
  version_number: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  teacher: Person;
  reviewer: Person;
  teacher_assignment: LessonPlanAssignment | null;
  versions?: Array<{
    id: string;
    version_number: number;
    change_note: string | null;
    created_at: string;
    created_by: Person;
  }>;
  events?: Array<{
    id: string;
    status: LessonPlanStatus;
    note: string | null;
    created_at: string;
    acted_by: Person;
  }>;
};

export type LessonPlanInput = {
  teacherAssignmentId: string;
  title: string;
  unitNumber: number;
  unitName: string;
  durationPeriods: number;
  startDate: string;
  endDate: string;
  learningStandards: string;
  indicators: string;
  learningObjectives: string;
  essentialContent: string;
  learnerCompetencies: string;
  desiredCharacteristics: string;
  guidingQuestions: string;
  learningActivities: string;
  learningMedia: string;
  assessment: string;
};

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message ?? fallback);
  return json;
}

export async function listLessonPlans(scope: 'mine' | 'review' = 'mine') {
  const response = await fetch(`/api/lesson-plans?scope=${scope}`);
  const data = await parseResponse<{ lessonPlans: LessonPlan[] }>(
    response,
    'ไม่สามารถโหลดแผนการสอนได้'
  );
  return data.lessonPlans;
}

export async function listLessonPlansForReview() {
  const response = await fetch('/api/lesson-plans?scope=review');
  return parseResponse<{ lessonPlans: LessonPlan[]; canManage: boolean }>(
    response,
    'ไม่สามารถโหลดแผนที่รอตรวจได้'
  );
}

export async function listLessonPlanTemplates() {
  const response = await fetch('/api/lesson-plans?scope=templates');
  const data = await parseResponse<{ lessonPlans: LessonPlan[] }>(
    response,
    'ไม่สามารถโหลดเทมเพลตแผนการสอนได้'
  );
  return data.lessonPlans;
}

export async function getLessonPlan(id: string) {
  const response = await fetch(`/api/lesson-plans/${id}`);
  const data = await parseResponse<{ lessonPlan: LessonPlan }>(
    response,
    'ไม่สามารถโหลดแผนการสอนได้'
  );
  return data.lessonPlan;
}

export async function listLessonPlanOptions() {
  const response = await fetch('/api/lesson-plans/options');
  const data = await parseResponse<{ options: LessonPlanAssignment[] }>(
    response,
    'ไม่สามารถโหลดรายวิชาที่สอนได้'
  );
  return data.options;
}

export async function createLessonPlan(
  input: LessonPlanInput & { saveMode?: 'draft'; tab?: string }
) {
  const response = await fetch('/api/lesson-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await parseResponse<{ lessonPlan: LessonPlan }>(response, 'สร้างแผนการสอนไม่สำเร็จ'))
    .lessonPlan;
}

export async function updateLessonPlan(
  id: string,
  input: LessonPlanInput & {
    expectedVersion: number;
    changeNote?: string;
    saveMode?: 'draft';
    tab?: string;
  }
) {
  const response = await fetch(`/api/lesson-plans/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await parseResponse<{ lessonPlan: LessonPlan }>(response, 'แก้ไขแผนการสอนไม่สำเร็จ'))
    .lessonPlan;
}

export async function deleteLessonPlan(id: string) {
  const response = await fetch(`/api/lesson-plans/${id}`, { method: 'DELETE' });
  await parseResponse<{ success: true }>(response, 'ลบแผนการสอนไม่สำเร็จ');
}

export async function copyLessonPlan(id: string) {
  const response = await fetch(`/api/lesson-plans/${id}/copy`, { method: 'POST' });
  return (await parseResponse<{ lessonPlan: LessonPlan }>(response, 'คัดลอกแผนการสอนไม่สำเร็จ'))
    .lessonPlan;
}

export async function updateLessonPlanStatus(
  id: string,
  action: 'submit' | 'revision' | 'approve' | 'archive',
  note?: string
) {
  const response = await fetch(`/api/lesson-plans/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note }),
  });
  return (await parseResponse<{ lessonPlan: LessonPlan }>(response, 'เปลี่ยนสถานะแผนไม่สำเร็จ'))
    .lessonPlan;
}
