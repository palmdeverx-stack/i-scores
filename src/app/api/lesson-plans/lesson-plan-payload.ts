// ----------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const LESSON_PLAN_DRAFT_TAB_COLUMNS: Record<string, string[]> = {
  'lesson-plan-general': [
    'teacher_assignment_id',
    'subject_id',
    'curriculum_id',
    'unit_id',
    'grade_levels',
    'title',
    'unit_number',
    'unit_name',
    'duration_periods',
    'start_date',
    'end_date',
  ],
  'lesson-plan-standards': [
    'subject_id',
    'indicator_ids',
    'learning_outcome_ids',
    'learning_standards',
    'milestone_indicators',
    'terminal_indicators',
    'template_section_contents',
  ],
  'lesson-plan-objectives': ['learning_objectives', 'template_section_contents'],
  'lesson-plan-essential': ['essential_content', 'template_section_contents'],
  'lesson-plan-characteristics': ['desired_characteristics', 'template_section_contents'],
  'lesson-plan-competencies': ['learner_competencies', 'template_section_contents'],
  'lesson-plan-questions': ['guiding_questions', 'template_section_contents'],
  'lesson-plan-activities': ['learning_activities', 'template_section_contents'],
  'lesson-plan-media': ['learning_media', 'template_section_contents'],
  'lesson-plan-assessment': ['assessment', 'template_section_contents'],
};

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const optionalText = (value: unknown, max: number) => text(value, max) || null;
const stringArray = (value: unknown, max: number) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
        ),
      ].slice(0, max)
    : [];
const jsonObject = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return JSON.stringify(value).length <= 1_000_000 ? (value as Record<string, unknown>) : {};
};

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
  const subjectId = text(value.subjectId, 36);
  const curriculumId = text(value.curriculumId, 36);
  const unitId = text(value.unitId, 36);
  const gradeLevels = stringArray(value.gradeLevels, 30);
  const indicatorIds = stringArray(value.indicatorIds, 300);
  const learningOutcomeIds = stringArray(value.learningOutcomeIds, 300);

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
    (startDate && endDate && startDate > endDate) ||
    (subjectId && !UUID_PATTERN.test(subjectId)) ||
    (curriculumId && !UUID_PATTERN.test(curriculumId)) ||
    (unitId && !UUID_PATTERN.test(unitId)) ||
    indicatorIds.some((id) => !UUID_PATTERN.test(id)) ||
    learningOutcomeIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    return null;
  }

  return {
    teacher_assignment_id: teacherAssignmentId,
    subject_id: subjectId || null,
    curriculum_id: curriculumId || null,
    unit_id: unitId || null,
    grade_levels: gradeLevels,
    indicator_ids: indicatorIds,
    learning_outcome_ids: learningOutcomeIds,
    title,
    unit_number: unitNumber,
    unit_name: unitName,
    duration_periods: durationPeriods,
    start_date: startDate,
    end_date: endDate,
    learning_standards: optionalText(value.learningStandards, 20000),
    milestone_indicators: optionalText(value.milestoneIndicators, 20000),
    terminal_indicators: optionalText(value.terminalIndicators, 20000),
    learning_objectives: optionalText(value.learningObjectives, 20000),
    essential_content: optionalText(value.essentialContent, 30000),
    learner_competencies: optionalText(value.learnerCompetencies, 30000),
    desired_characteristics: optionalText(value.desiredCharacteristics, 30000),
    guiding_questions: optionalText(value.guidingQuestions, 30000),
    learning_activities: optionalText(value.learningActivities, 50000),
    learning_media: optionalText(value.learningMedia, 20000),
    assessment: optionalText(value.assessment, 30000),
    template_section_contents: jsonObject(value.templateSectionContents),
  };
}
