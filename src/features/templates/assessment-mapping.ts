import type {
  AssessmentContent,
  LearningObjectiveItem,
  ObjectiveAssessmentRow,
  LearningObjectiveContent,
} from './types';

const DOMAIN_CODES: Record<LearningObjectiveItem['domain'], string> = {
  knowledge: 'K',
  process: 'P',
  attitude: 'A',
};

function objectiveStatement(objective: LearningObjectiveItem) {
  return (
    [objective.condition, objective.behaviorVerb, objective.expectedResult]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ') ||
    objective.description?.trim() ||
    ''
  );
}

export function learningObjectiveItems(content?: LearningObjectiveContent | null) {
  if (!content) return [];
  if (content.objectives?.length) return content.objectives;

  const hasLegacyContent = [
    content.description,
    content.behaviorVerb,
    content.condition,
    content.expectedResult,
  ].some((value) => value?.trim());

  return hasLegacyContent
    ? [
        {
          id: 'legacy-objective',
          description: content.description,
          domain: content.domain ?? 'knowledge',
          behaviorVerb: content.behaviorVerb,
          condition: content.condition,
          expectedResult: content.expectedResult,
          successCriteria: content.successCriteria,
        } satisfies LearningObjectiveItem,
      ]
    : [];
}

export function objectiveAssessmentIssue(objective: LearningObjectiveItem) {
  const statement = objectiveStatement(objective);
  if (!statement) return '';
  return `${statement} (${DOMAIN_CODES[objective.domain]})`;
}

export function mapObjectivesToAssessmentRows(
  objectiveContent?: LearningObjectiveContent | null,
  assessmentContent?: Partial<AssessmentContent> | null
): ObjectiveAssessmentRow[] {
  const existingRows = assessmentContent?.rows ?? [];

  return learningObjectiveItems(objectiveContent).flatMap((objective, index) => {
    const issue = objectiveAssessmentIssue(objective);
    if (!issue) return [];

    const existing =
      existingRows.find((row) => row.objectiveId === objective.id) ?? existingRows[index];

    return [
      {
        objectiveId: objective.id,
        issue,
        method: existing?.method ?? assessmentContent?.method ?? '',
        instrument: existing?.instrument ?? assessmentContent?.instrument ?? '',
        criteria: existing?.criteria ?? assessmentContent?.criteria ?? '',
      },
    ];
  });
}
