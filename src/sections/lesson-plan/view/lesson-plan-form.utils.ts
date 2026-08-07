import type { LessonPlanInput } from '../lesson-plan-actions';
import type {
  LearningMediaItem,
  LessonPlanFormValues,
  SerializedObjectiveGroup,
} from './lesson-plan-form.schema';
import type {
  TemplateType,
  TemplateInput,
  LessonTemplate,
  EvaluationStudent,
  AssessmentContent,
  SectionTemplateContent,
  LearningObjectiveContent,
  LessonPlanTemplateContent,
} from 'src/features/templates/types';

import dayjs from 'dayjs';

import { defaultTemplateContent } from 'src/features/templates/template-defaults';
import { mapObjectivesToAssessmentRows } from 'src/features/templates/assessment-mapping';

import {
  EMPTY_FORM,
  TAB_LABELS,
  EMPTY_GROUP_CODE,
  EMPTY_GROUP_LABEL,
  TAB_TEMPLATE_TYPES,
  serializeObjectives,
} from './lesson-plan-form.schema';
import {
  parseAssessment,
  parseIndicators,
  serializeAssessment,
  serializeIndicators,
  richTextToPlainText,
  parseLearningActivities,
  serializeLearningActivities,
} from '../lesson-plan-content';

// ----------------------------------------------------------------------

export const DEFAULT_TEMPLATE_METADATA = {
  teachingMethods: [],
  bloomLevels: [],
  competencyIds: [],
  characteristicIds: [],
  keywords: [],
  suitableFor: [],
  estimatedMinutes: undefined,
};

export function plainText(value?: string | null) {
  return richTextToPlainText(value);
}

export function subjectLearningStandardText(subject: {
  learning_standard_code?: string | null;
  learning_standards?: string | null;
}) {
  return [subject.learning_standard_code?.trim(), plainText(subject.learning_standards)]
    .filter(Boolean)
    .join(' ');
}

export function parseLearningMedia(value?: string | null): LearningMediaItem[] {
  const items = plainText(value)
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+(?:\.\d+)*[.)]?|[-•])\s*/, '').trim())
    .filter(Boolean)
    .map((content) => ({ content }));

  return items.length ? items : [{ content: '' }];
}

export function serializeLearningMedia(items: LearningMediaItem[]) {
  return items
    .map((item) => item.content.trim())
    .filter(Boolean)
    .map((item, index) => `8.${index + 1} ${item}`)
    .join('\n');
}

export function splitItems(value: string) {
  const source = /<[^>]+>/.test(value) ? richTextToPlainText(value) : value;
  return source ? source.split('\n') : [''];
}

export function parseObjectives(value: string): SerializedObjectiveGroup[] {
  const source = /<[^>]+>/.test(value) ? richTextToPlainText(value) : value;
  const groups: SerializedObjectiveGroup[] = [];
  let currentGroup: SerializedObjectiveGroup | null = null;

  source.split('\n').forEach((line) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) return;

    if (/^\d+[.)](?:\s|$)/.test(normalizedLine)) {
      if (!currentGroup) {
        currentGroup = { label: 'ด้านความรู้ความเข้าใจ', code: 'K', items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(line.replace(/^\s*\d+[.)]\s*/, ''));
      return;
    }

    const editableHeader = line.match(/^(.*?)\t\(([^()]*)\)\.?$/);
    const legacyHeader = normalizedLine.match(/^(.+?)\s*\(([^()]*)\)\.?$/);
    const header = editableHeader ?? legacyHeader;
    if (header) {
      currentGroup = {
        label: header[1] === EMPTY_GROUP_LABEL ? '' : header[1],
        code: header[2] === EMPTY_GROUP_CODE ? '' : header[2],
        items: [],
      };
      groups.push(currentGroup);
      return;
    }

    if (!currentGroup) {
      currentGroup = { label: 'ด้านความรู้ความเข้าใจ', code: 'K', items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(line.replace(/^\s*\d+[.)]\s*/, ''));
  });

  return groups.length ? groups : [{ label: '', code: '', items: [] }];
}

export function parseLearningStandardRows(
  value?: string | null
): LessonPlanFormValues['learningStandards'] {
  return splitItems(value ?? '').map((content) => ({ content }));
}

export function serializeLearningStandardRows(rows: LessonPlanFormValues['learningStandards']) {
  return rows
    .map((row) => row.content.trim())
    .filter(Boolean)
    .join('\n');
}

export function parseObjectiveFormGroups(
  value?: string | null
): LessonPlanFormValues['learningObjectives'] {
  return parseObjectives(value ?? '').map((group) => ({
    code: group.code,
    label: group.label,
    items: (group.items.length ? group.items : ['']).map((content) => ({ content })),
  }));
}

export function cleanObjectives(groups: LessonPlanFormValues['learningObjectives']) {
  const cleanedGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.map((item) => item.content).filter((item) => item.trim()),
    }))
    .filter((group) => group.items.length);

  return serializeObjectives(cleanedGroups);
}

export function parseIndicatorFormRows(
  value?: string | null
): LessonPlanFormValues['milestoneIndicators'] {
  const rows = parseIndicators(value);
  return rows.length ? rows : [{ code: '', description: '' }];
}

export function objectivesToAssessmentIssues(groups: LessonPlanFormValues['learningObjectives']) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.map((item) => item.content).filter((item) => item.trim()),
    }))
    .filter((group) => group.items.length)
    .map((group) => {
      const heading = [group.label.trim(), group.code.trim() ? `(${group.code.trim()})` : '']
        .filter(Boolean)
        .join(' ');
      const items = group.items.map((item, index) => `${index + 1}. ${item.trim()}`);

      return [heading, ...items].filter(Boolean).join('\n');
    });
}

export function toPayload(values: LessonPlanFormValues): LessonPlanInput {
  const { evaluationStudents, templateSectionContents, ...planValues } = values;
  return {
    ...planValues,
    templateSectionContents: {
      ...templateSectionContents,
      _evaluationStudents: evaluationStudents,
    },
    learningStandards: serializeLearningStandardRows(values.learningStandards),
    milestoneIndicators: serializeIndicators(values.milestoneIndicators),
    terminalIndicators: serializeIndicators(values.terminalIndicators),
    learningObjectives: cleanObjectives(values.learningObjectives),
    learningActivities: serializeLearningActivities(values.learningActivities),
    learningMedia: serializeLearningMedia(values.learningMedia),
    assessment: serializeAssessment(values.assessment),
    startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : '',
    endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : '',
  };
}

const DOMAIN_BY_CODE = {
  K: 'knowledge',
  P: 'process',
  A: 'attitude',
} as const;

const OBJECTIVE_GROUP_BY_DOMAIN = {
  knowledge: { code: 'K', label: 'ด้านความรู้' },
  process: { code: 'P', label: 'ด้านทักษะ/กระบวนการ' },
  attitude: { code: 'A', label: 'ด้านคุณลักษณะ' },
} as const;

function structuredItemsFromText(value: string) {
  return plainText(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title) => ({ id: crypto.randomUUID(), code: '', title, description: '' }));
}

function structuredItemText(item: Record<string, unknown>) {
  return [item.code, item.title, item.description]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

/**
 * Adapts the legacy lesson-plan columns to the shared Template editor model.
 * This lets existing plans open in the new editor without a data migration.
 */
export function legacyValuesToTemplateSections(values: LessonPlanFormValues) {
  const existing = values.templateSectionContents ?? {};
  const objectiveItems = values.learningObjectives.flatMap((group) =>
    group.items.map((item) => ({
      id: crypto.randomUUID(),
      description: item.content,
      domain:
        DOMAIN_BY_CODE[group.code.trim().toUpperCase() as keyof typeof DOMAIN_BY_CODE] ??
        'knowledge',
      behaviorVerb: '',
      condition: '',
      expectedResult: item.content,
      successCriteria: '',
    }))
  );

  return {
    ...Object.fromEntries(
      Object.entries(TAB_TEMPLATE_TYPES).map(([tabId, type]) => [
        tabId,
        structuredClone(existing[tabId] ?? defaultTemplateContent(type)),
      ])
    ),
    ...existing,
    'lesson-plan-standards': {
      items: values.learningStandards.map((row) => ({
        id: crypto.randomUUID(),
        code: '',
        title: row.content,
        description: '',
      })),
      milestoneIndicators: values.milestoneIndicators.map((row) => ({
        id: crypto.randomUUID(),
        code: row.code,
        title: row.description,
        description: '',
      })),
      terminalIndicators: values.terminalIndicators.map((row) => ({
        id: crypto.randomUUID(),
        code: row.code,
        title: row.description,
        description: '',
      })),
    },
    'lesson-plan-objectives': {
      objectives: objectiveItems.length
        ? objectiveItems
        : (defaultTemplateContent('learning_objective') as LearningObjectiveContent).objectives,
    },
    'lesson-plan-essential': {
      content: values.essentialContent,
      keyConcepts: [],
    },
    'lesson-plan-characteristics': {
      items: structuredItemsFromText(values.desiredCharacteristics),
    },
    'lesson-plan-competencies': {
      items: structuredItemsFromText(values.learnerCompetencies),
    },
    'lesson-plan-questions': {
      questions: plainText(values.guidingQuestions)
        .split('\n')
        .map((question) => question.trim())
        .filter(Boolean)
        .map((question) => ({
          id: crypto.randomUUID(),
          question,
          bloomLevel: 'understand' as const,
          expectedAnswer: '',
          followUpQuestions: [],
        })),
    },
    'lesson-plan-activities': {
      items: values.learningActivities.map((item) => ({
        id: crypto.randomUUID(),
        title: item.title,
        description: item.description,
      })),
    },
    'lesson-plan-media': {
      items: values.learningMedia.map((item) => ({
        id: crypto.randomUUID(),
        mediaType: 'other' as const,
        title: item.content,
        description: '',
        url: '',
        marketplaceProductId: '',
        usageInstructions: '',
      })),
    },
    'lesson-plan-assessment': {
      ...defaultTemplateContent('assessment'),
      rows: values.assessment.map((row, index) => ({
        objectiveId: objectiveItems[index]?.id ?? crypto.randomUUID(),
        issue: row.issue,
        method: row.method,
        instrument: row.tool,
        criteria: row.criteria,
      })),
    },
  };
}

/** Converts shared Template editor fields back to the existing lesson-plan API payload shape. */
export function templateSectionsToLegacyValues(values: LessonPlanFormValues): LessonPlanFormValues {
  const section = (tabId: string) =>
    (values.templateSectionContents?.[tabId] ?? {}) as Record<string, unknown>;
  const rows = (tabId: string, field = 'items') => {
    const value = section(tabId)[field];
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  };
  const standards = section('lesson-plan-standards');
  const standardsRows = rows('lesson-plan-standards');
  const milestoneRows = Array.isArray(standards.milestoneIndicators)
    ? (standards.milestoneIndicators as Array<Record<string, unknown>>)
    : [];
  const terminalRows = Array.isArray(standards.terminalIndicators)
    ? (standards.terminalIndicators as Array<Record<string, unknown>>)
    : [];
  const objectiveRows = rows('lesson-plan-objectives', 'objectives');
  const objectiveGroups = new Map<string, LessonPlanFormValues['learningObjectives'][number]>();
  objectiveRows.forEach((objective) => {
    const domain = String(
      objective.domain ?? 'knowledge'
    ) as keyof typeof OBJECTIVE_GROUP_BY_DOMAIN;
    const groupInfo = OBJECTIVE_GROUP_BY_DOMAIN[domain] ?? OBJECTIVE_GROUP_BY_DOMAIN.knowledge;
    const content =
      [objective.condition, objective.behaviorVerb, objective.expectedResult]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .join(' ') || String(objective.description ?? '').trim();
    if (!content) return;
    const group = objectiveGroups.get(domain) ?? { ...groupInfo, items: [] };
    group.items.push({ content });
    objectiveGroups.set(domain, group);
  });
  const questionRows = rows('lesson-plan-questions', 'questions');
  const mediaRows = rows('lesson-plan-media');
  const assessmentRows = rows('lesson-plan-assessment', 'rows');

  return {
    ...values,
    learningStandards: (standardsRows.length ? standardsRows : [{}]).map((item) => ({
      content: structuredItemText(item),
    })),
    milestoneIndicators: (milestoneRows.length ? milestoneRows : [{}]).map((item) => ({
      code: String(item.code ?? ''),
      description: String(item.title ?? item.description ?? ''),
    })),
    terminalIndicators: (terminalRows.length ? terminalRows : [{}]).map((item) => ({
      code: String(item.code ?? ''),
      description: String(item.title ?? item.description ?? ''),
    })),
    learningObjectives: objectiveGroups.size
      ? [...objectiveGroups.values()]
      : [{ label: '', code: '', items: [{ content: '' }] }],
    essentialContent: String(section('lesson-plan-essential').content ?? ''),
    desiredCharacteristics: rows('lesson-plan-characteristics')
      .map(structuredItemText)
      .filter(Boolean)
      .join('\n'),
    learnerCompetencies: rows('lesson-plan-competencies')
      .map(structuredItemText)
      .filter(Boolean)
      .join('\n'),
    guidingQuestions: questionRows
      .map((item) => String(item.question ?? '').trim())
      .filter(Boolean)
      .join('\n'),
    learningActivities: rows('lesson-plan-activities').map((item) => ({
      title: String(item.title ?? ''),
      description: String(item.description ?? ''),
    })),
    learningMedia: mediaRows.map((item) => ({
      content: [item.title, item.description, item.url, item.usageInstructions]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .join(' · '),
    })),
    assessment: assessmentRows.map((item) => ({
      issue: String(item.issue ?? ''),
      method: String(item.method ?? ''),
      tool: String(item.instrument ?? ''),
      criteria: String(item.criteria ?? ''),
    })),
  };
}

export function structuredTemplateText(template?: LessonTemplate) {
  if (!template) return '';
  const content = template.content as Record<string, unknown>;
  const items = (content.items ?? []) as Array<{
    code?: string;
    title?: string;
    description?: string;
  }>;
  if (items.length) {
    return items
      .map((item) => [item.code, item.title, item.description].filter(Boolean).join(' · '))
      .join('\n');
  }
  return '';
}

export function templateDocumentValues(
  template: LessonTemplate,
  sectionTemplates: LessonTemplate[]
): LessonPlanFormValues {
  const content = template.content as LessonPlanTemplateContent;
  const document = content.document;
  const byType = new Map(sectionTemplates.map((item) => [item.template_type, item]));
  const inlineByType = new Map(content.sections.map((section) => [section.sectionType, section]));
  const reusableContent = (type: TemplateType) =>
    (inlineByType.get(type)?.content ??
      byType.get(type)?.content ??
      defaultTemplateContent(type)) as SectionTemplateContent;
  const sectionContent = (type: string) =>
    reusableContent(type as TemplateType) as unknown as Record<string, unknown>;
  const standardsText =
    document?.learningStandards || structuredTemplateText(byType.get('learning_standard'));
  const objectiveContent = sectionContent('learning_objective');
  const objectiveDescription = String(objectiveContent.description ?? '');
  const objectiveDomain = String(objectiveContent.domain ?? 'knowledge');
  const objectiveLabels: Record<string, [string, string]> = {
    knowledge: ['ด้านความรู้', 'K'],
    process: ['ด้านทักษะ/กระบวนการ', 'P'],
    attitude: ['ด้านคุณลักษณะ', 'A'],
  };
  const [objectiveLabel, objectiveCode] = objectiveLabels[objectiveDomain] ?? [
    'จุดประสงค์การเรียนรู้',
    '',
  ];
  const essential = sectionContent('essential_content');
  const activities = sectionContent('learning_activity');
  const questions = sectionContent('question');
  const media = sectionContent('media');
  const assessment = sectionContent('assessment');
  const indicatorTemplate = byType.get('learning_standard');
  const indicatorTemplateContent = (indicatorTemplate?.content as Record<string, unknown>) ?? {};
  const fallbackMilestoneIndicators = (indicatorTemplateContent.milestoneIndicators ??
    []) as Array<{
    code?: string;
    title?: string;
    description?: string;
  }>;
  const fallbackTerminalIndicators = (indicatorTemplateContent.terminalIndicators ?? []) as Array<{
    code?: string;
    title?: string;
    description?: string;
  }>;
  const activityRows = (
    (activities.items ?? []) as Array<{
      title?: string;
      description?: string;
    }>
  )
    .map((item) => ({
      title: String(item.title ?? ''),
      description: String(item.description ?? ''),
    }))
    .filter((row) => row.title || row.description);
  const questionLines = ((questions.questions ?? []) as Array<{ question?: string }>)
    .map((item) => item.question)
    .filter(Boolean)
    .join('\n');
  const mediaItems = (media.items as Array<Record<string, unknown>> | undefined) ?? [media];
  const mediaLines = mediaItems
    .flatMap((item) => [item.title, item.description, item.usageInstructions])
    .filter(Boolean)
    .join('\n');
  const legacyStudentLists = [
    'worksheet_assessment_record',
    'desired_characteristic_assessment',
    'competency_assessment',
    'behavior_observation',
  ].map((type) => sectionContent(type).students);
  const legacyEvaluationStudents =
    legacyStudentLists.find(
      (students): students is Array<{ id?: string; name?: string }> =>
        Array.isArray(students) && students.some((student) => Boolean(student.name?.trim()))
    ) ??
    legacyStudentLists.find((students): students is Array<{ id?: string; name?: string }> =>
      Array.isArray(students)
    );
  const evaluationStudents = (
    content.evaluationStudents?.length
      ? content.evaluationStudents
      : (legacyEvaluationStudents ?? [])
  ).map((student) => ({
    id: student.id || crypto.randomUUID(),
    name: student.name ?? '',
  }));

  return {
    ...EMPTY_FORM,
    curriculumId: document?.curriculumId ?? template.curriculum_id,
    subjectId: document?.subjectId ?? template.subject_id,
    unitId: document?.unitId ?? template.unit_id,
    gradeLevels: document?.gradeLevels ?? template.grade_levels,
    indicatorIds: document?.indicatorIds ?? template.indicator_ids,
    learningOutcomeIds: document?.learningOutcomeIds ?? template.learning_outcome_ids,
    title: document?.title ?? template.name,
    unitNumber: document?.unitNumber ?? 1,
    unitName:
      document?.unitName ?? content.cover?.learningArea ?? template.subject?.name ?? template.name,
    durationPeriods:
      document?.durationPeriods ??
      Math.max(1, Math.ceil((template.metadata.estimatedMinutes ?? 50) / 50)),
    startDate: document?.startDate || null,
    endDate: document?.endDate || null,
    learningStandards: parseLearningStandardRows(standardsText),
    milestoneIndicators: document?.milestoneIndicators
      ? parseIndicatorFormRows(document.milestoneIndicators)
      : fallbackMilestoneIndicators.length
        ? fallbackMilestoneIndicators.map((item) => ({
            code: item.code ?? '',
            description: item.description ?? item.title ?? '',
          }))
        : [{ code: '', description: '' }],
    terminalIndicators: document?.terminalIndicators
      ? parseIndicatorFormRows(document.terminalIndicators)
      : fallbackTerminalIndicators.length
        ? fallbackTerminalIndicators.map((item) => ({
            code: item.code ?? '',
            description: item.description ?? item.title ?? '',
          }))
        : [{ code: '', description: '' }],
    learningObjectives: document?.learningObjectives
      ? parseObjectiveFormGroups(document.learningObjectives)
      : [
          {
            label: objectiveLabel,
            code: objectiveCode,
            items: [{ content: objectiveDescription }],
          },
        ],
    essentialContent: document?.essentialContent ?? String(essential.content ?? ''),
    learnerCompetencies:
      document?.learnerCompetencies ||
      structuredTemplateText(byType.get('competency')) ||
      structuredTemplateText(byType.get('learner_development')),
    desiredCharacteristics:
      document?.desiredCharacteristics ||
      structuredTemplateText(byType.get('desired_characteristic')),
    guidingQuestions: document?.guidingQuestions ?? questionLines,
    learningActivities: document?.learningActivities
      ? parseLearningActivities(document.learningActivities)
      : activityRows.length
        ? activityRows
        : [{ title: '', description: structuredTemplateText(byType.get('learning_task')) }],
    learningMedia: parseLearningMedia(document?.learningMedia ?? mediaLines),
    assessment: document?.assessment
      ? parseAssessment(document.assessment)
      : assessment.method || assessment.instrument || assessment.criteria
        ? [
            {
              issue: String(assessment.evidence ?? ''),
              method: String(assessment.method ?? ''),
              tool: String(assessment.instrument ?? ''),
              criteria: String(assessment.criteria ?? ''),
            },
          ]
        : [],
    evaluationStudents,
    templateSectionContents: {
      cover: content.cover ?? {},
      pdfSettings: content.pdfSettings ?? {},
      ...Object.fromEntries(
        Object.entries(TAB_TEMPLATE_TYPES).map(([tabId, type]) => [tabId, reusableContent(type)])
      ),
    },
  };
}

export function templateDocumentInput(
  values: LessonPlanFormValues,
  sectionOrder: string[],
  existing?: LessonTemplate,
  enabledEvaluationSections: string[] = []
): TemplateInput {
  const payload = toPayload(values);
  const { teacherAssignmentId, ...serializedDocument } = payload;
  void teacherAssignmentId;
  const document = {
    ...serializedDocument,
    curriculumId: null,
    subjectId: null,
    unitId: null,
    indicatorIds: [],
    learningOutcomeIds: [],
    sectionOrder,
    startDate: '',
    endDate: '',
  };
  const currentContent = existing?.content as LessonPlanTemplateContent | undefined;
  const currentCover = currentContent?.cover ?? {};
  const existingByType = new Map(
    (currentContent?.sections ?? []).map((section) => [section.sectionType, section])
  );
  const evaluationStudents = values.evaluationStudents as EvaluationStudent[];
  const sections = sectionOrder.flatMap((tabId) => {
    const sectionType = TAB_TEMPLATE_TYPES[tabId as keyof typeof TAB_TEMPLATE_TYPES];
    if (!sectionType) return [];
    const existingSection = existingByType.get(sectionType);
    const sectionContent = structuredClone(
      values.templateSectionContents[tabId] ?? defaultTemplateContent(sectionType)
    ) as Record<string, unknown>;
    if (
      [
        'worksheet_assessment_record',
        'desired_characteristic_assessment',
        'competency_assessment',
        'behavior_observation',
      ].includes(sectionType)
    ) {
      const currentStudents = Array.isArray(sectionContent.students)
        ? (sectionContent.students as Array<Record<string, unknown>>)
        : [];
      const scoreCount =
        sectionType === 'worksheet_assessment_record'
          ? Array.isArray(sectionContent.scoreColumns)
            ? sectionContent.scoreColumns.length
            : 0
          : sectionType === 'desired_characteristic_assessment'
            ? Array.isArray(sectionContent.characteristicGroups)
              ? (sectionContent.characteristicGroups as Array<Record<string, unknown>>).reduce(
                  (total, group) =>
                    total + (Array.isArray(group.behaviors) ? group.behaviors.length : 0),
                  0
                )
              : 0
            : sectionType === 'competency_assessment' && Array.isArray(sectionContent.domains)
              ? sectionContent.domains.length
              : sectionType === 'behavior_observation' && Array.isArray(sectionContent.behaviors)
                ? sectionContent.behaviors.length
                : 0;
      sectionContent.students = evaluationStudents.map((student, studentIndex) => {
        const current =
          currentStudents.find((item) => item.id === student.id) ?? currentStudents[studentIndex];
        if (sectionType === 'behavior_observation') {
          const observations = Array.isArray(current?.observations) ? current.observations : [];
          return {
            ...current,
            id: student.id,
            name: student.name,
            observations: Array.from({ length: scoreCount }, (_, index) =>
              Boolean(observations[index])
            ),
          };
        }
        const scores = Array.isArray(current?.scores) ? current.scores : [];
        return {
          ...current,
          id: student.id,
          name: student.name,
          scores: Array.from({ length: scoreCount }, (_, index) => Number(scores[index] ?? 0)),
        };
      });
    }
    return [
      {
        id: existingSection?.id ?? crypto.randomUUID(),
        sectionType,
        templateId: existingSection?.templateId,
        title: TAB_LABELS[tabId],
        order: 0,
        required: existingSection?.required ?? true,
        enabled:
          sectionType.endsWith('_assessment') || sectionType === 'behavior_observation'
            ? enabledEvaluationSections.includes(tabId)
            : sectionType === 'worksheet_assessment_record'
              ? enabledEvaluationSections.includes(tabId)
              : true,
        content: sectionContent as SectionTemplateContent,
      },
    ];
  });
  sections.forEach((section, order) => {
    section.order = order;
  });
  const objectiveContent = values.templateSectionContents[
    'lesson-plan-objectives'
  ] as LearningObjectiveContent;
  const assessmentContent = values.templateSectionContents[
    'lesson-plan-assessment'
  ] as AssessmentContent;
  const mappedAssessmentRows = mapObjectivesToAssessmentRows(objectiveContent, assessmentContent);
  document.assessment = serializeAssessment(
    mappedAssessmentRows.map((row) => ({
      issue: row.issue,
      method: row.method,
      tool: row.instrument,
      criteria: row.criteria,
    }))
  );
  return {
    name: values.title,
    description: existing?.description ?? '',
    templateType: 'lesson_plan',
    scope: existing?.scope === 'school' ? 'school' : 'personal',
    status: existing?.status ?? 'draft',
    content: {
      ...currentContent,
      evaluationStudents,
      cover: {
        ...(values.templateSectionContents.cover as LessonPlanTemplateContent['cover']),
        heading: undefined,
        learningArea: values.unitName,
        logoUrl: currentCover.logoUrl,
      },
      pdfSettings: values.templateSectionContents
        .pdfSettings as LessonPlanTemplateContent['pdfSettings'],
      sections,
      document,
    },
    metadata: existing?.metadata ?? DEFAULT_TEMPLATE_METADATA,
    tags: existing?.tags ?? [],
    curriculumId: null,
    subjectId: null,
    unitId: null,
    courseId: null,
    gradeLevels: values.gradeLevels,
    indicatorIds: [],
    learningOutcomeIds: [],
  };
}
