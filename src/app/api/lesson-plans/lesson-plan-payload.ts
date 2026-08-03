// ----------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const LESSON_PLAN_DRAFT_TAB_COLUMNS: Record<string, string[]> = {
  'lesson-plan-general': [
    'teacher_assignment_id',
    'title',
    'unit_number',
    'unit_name',
    'duration_periods',
    'start_date',
    'end_date',
  ],
  'lesson-plan-standards': ['learning_standards', 'indicators'],
  'lesson-plan-objectives': ['learning_objectives'],
  'lesson-plan-essential': ['essential_content'],
  'lesson-plan-characteristics': ['desired_characteristics'],
  'lesson-plan-competencies': ['learner_competencies'],
  'lesson-plan-questions': ['guiding_questions'],
  'lesson-plan-activities': ['learning_activities'],
  'lesson-plan-media': ['learning_media'],
  'lesson-plan-assessment': ['assessment'],
};

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const optionalText = (value: unknown, max: number) => text(value, max) || null;

export type LessonPlanPayload = ReturnType<typeof parseLessonPlanPayload>;

export function parseLessonPlanPayload(
  body: unknown,
  { allowIncomplete = false }: { allowIncomplete?: boolean } = {}
) {
  if (!body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  const teacherAssignmentId = text(value.teacherAssignmentId, 36);
  const title = text(value.title, 200);
  const unitName = text(value.unitName, 300);
  const unitNumber = Number(value.unitNumber);
  const durationPeriods = Number(value.durationPeriods);
  const startDate = optionalText(value.startDate, 10);
  const endDate = optionalText(value.endDate, 10);

  if (
    !UUID_PATTERN.test(teacherAssignmentId) ||
    (!allowIncomplete && !title) ||
    (!allowIncomplete && !unitName) ||
    !Number.isInteger(unitNumber) ||
    unitNumber < 1 ||
    !Number.isInteger(durationPeriods) ||
    durationPeriods < 1 ||
    durationPeriods > 200 ||
    (startDate && !DATE_PATTERN.test(startDate)) ||
    (endDate && !DATE_PATTERN.test(endDate)) ||
    (startDate && endDate && startDate > endDate)
  ) {
    return null;
  }

  return {
    teacher_assignment_id: teacherAssignmentId,
    title,
    unit_number: unitNumber,
    unit_name: unitName,
    duration_periods: durationPeriods,
    start_date: startDate,
    end_date: endDate,
    learning_standards: optionalText(value.learningStandards, 20000),
    indicators: optionalText(value.indicators, 20000),
    learning_objectives: optionalText(value.learningObjectives, 20000),
    essential_content: optionalText(value.essentialContent, 30000),
    learner_competencies: optionalText(value.learnerCompetencies, 30000),
    desired_characteristics: optionalText(value.desiredCharacteristics, 30000),
    guiding_questions: optionalText(value.guidingQuestions, 30000),
    learning_activities: optionalText(value.learningActivities, 50000),
    learning_media: optionalText(value.learningMedia, 20000),
    assessment: optionalText(value.assessment, 30000),
  };
}
