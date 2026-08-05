'use client';

import type { Resolver } from 'react-hook-form';
import type { DropResult } from '@hello-pangea/dnd';
import type { LessonPlan } from '../lesson-plan-actions';
import type { LessonPlanFormValues } from './lesson-plan-form.schema';
import type { TemplateAIResult } from 'src/features/ai/types/ai.types';
import type { PublishTemplateScope } from 'src/features/templates/components/template-publish-dialog';
import type {
  TemplateType,
  LessonTemplate,
  EvaluationStudent,
  SectionTemplateContent,
  LearningObjectiveContent,
  LessonPlanTemplateContent,
} from 'src/features/templates/types';

import dynamic from 'next/dynamic';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { TemplateAIDialog } from 'src/features/ai/components/template-ai-dialog';
import { defaultTemplateContent } from 'src/features/templates/template-defaults';
import { TemplatePublishDialog } from 'src/features/templates/components/template-publish-dialog';
import { LessonPlanTemplatePickerDialog } from 'src/features/templates/components/lesson-plan-template-picker-dialog';
import {
  createTemplate,
  updateTemplate,
  deleteTemplateLogo,
  getTemplateOptions,
  uploadTemplateLogo,
  getTemplateDocument,
} from 'src/features/templates/template-actions';

import { toast } from 'src/components/snackbar';
import { Form } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { GeneralTab } from './tabs/general-tab';
import { LessonPlanTabNav } from './lesson-plan-tab-nav';
import { LessonPlanFooterBar } from './lesson-plan-footer-bar';
import { TemplateContentTab } from './tabs/template-content-tab';
import { parseAssessment, parseLearningActivities } from '../lesson-plan-content';
import {
  getLessonPlan,
  createLessonPlan,
  updateLessonPlan,
  listLessonPlanOptions,
  listLessonPlanTemplates,
} from '../lesson-plan-actions';
import {
  EMPTY_FORM,
  TAB_LABELS,
  TAB_FORM_FIELDS,
  DEFAULT_TAB_ORDER,
  EVALUATION_TAB_IDS,
  TAB_TEMPLATE_TYPES,
  TAB_ORDER_STORAGE_KEY,
  TemplateLessonPlanSchema,
} from './lesson-plan-form.schema';
import {
  plainText,
  toPayload,
  parseLearningMedia,
  templateDocumentInput,
  parseIndicatorFormRows,
  templateDocumentValues,
  parseObjectiveFormGroups,
  parseLearningStandardRows,
  subjectLearningStandardText,
  legacyValuesToTemplateSections,
  templateSectionsToLegacyValues,
} from './lesson-plan-form.utils';

// ----------------------------------------------------------------------

function hasMeaningfulTemplateStep(type: TemplateType | undefined, content: unknown) {
  if (!type || !content || typeof content !== 'object') return false;
  const value = content as Record<string, unknown>;
  const hasText = (input: unknown) => Boolean(plainText(String(input ?? '')));
  const hasListText = (input: unknown, fields: string[]) =>
    Array.isArray(input) &&
    input.some((item) => {
      if (typeof item === 'string' || typeof item === 'number') return hasText(item);
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      return fields.some((field) => hasText(row[field]));
    });

  if (type === 'learning_standard')
    return ['items', 'milestoneIndicators', 'terminalIndicators'].some((field) =>
      hasListText(value[field], ['code', 'title', 'description'])
    );
  if (type === 'learning_objective')
    return hasListText(value.objectives, [
      'description',
      'behaviorVerb',
      'condition',
      'expectedResult',
      'successCriteria',
    ]);
  if (type === 'essential_content')
    return hasText(value.content) || hasListText(value.keyConcepts, []);
  if (
    ['competency', 'desired_characteristic', 'learner_development', 'learning_task'].includes(type)
  )
    return hasListText(value.items, ['code', 'title', 'description']);
  if (type === 'question') return hasListText(value.questions, ['question', 'expectedAnswer']);
  if (type === 'learning_activity') return hasListText(value.items, ['title', 'description']);
  if (type === 'media')
    return hasListText(value.items, ['title', 'description', 'url', 'usageInstructions']);
  if (type === 'assessment')
    return (
      hasListText(value.rows, ['issue', 'method', 'instrument', 'criteria']) ||
      ['method', 'instrument', 'evidence', 'criteria'].some((field) => hasText(value[field]))
    );
  if (type === 'reflection')
    return (
      [
        'studentCount',
        'passedCount',
        'passedPercentage',
        'notPassedCount',
        'notPassedPercentage',
      ].some(
        (field) => value[field] !== undefined && value[field] !== null && value[field] !== ''
      ) ||
      ['knowledgeResult', 'processResult', 'attitudeResult', 'problems', 'solutions'].some(
        (field) => hasText(value[field])
      ) ||
      hasListText(value.specialStudents, []) ||
      hasListText(value.sections, ['title', 'placeholder'])
    );
  if (type === 'worksheet_assessment_record')
    return (
      hasText(value.topic) ||
      hasText(value.evaluatorName) ||
      ((value.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        hasText(student.name)
      )
    );
  if (type === 'desired_characteristic_assessment')
    return (
      hasText(value.evaluatorName) ||
      ((value.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        hasText(student.name)
      )
    );
  if (type === 'competency_assessment')
    return (
      hasText(value.evaluatorName) ||
      ((value.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        hasText(student.name)
      )
    );
  if (type === 'behavior_observation')
    return (
      hasText(value.evaluatorName) ||
      ((value.students as Array<Record<string, unknown>> | undefined) ?? []).some((student) =>
        hasText(student.name)
      )
    );
  if (type === 'learning_content') return hasListText(value.topics, ['title', 'description']);
  if (type === 'rubric') return hasListText(value.criteria, ['name', 'description']);
  return false;
}

// ----------------------------------------------------------------------

const LessonPlanPdfDialog = dynamic(() => import('../components/lesson-plan-pdf-dialog'), {
  ssr: false,
});
const LessonPlanTemplatePdfViewer = dynamic(
  () => import('../components/lesson-plan-template-pdf-viewer'),
  { ssr: false }
);

// ----------------------------------------------------------------------

export function LessonPlanFormView({
  lessonPlanId,
  templateId,
  catalogTemplateId,
  catalogSourceTemplateId,
  newCatalogTemplate = false,
}: {
  lessonPlanId?: string;
  templateId?: string;
  catalogTemplateId?: string;
  catalogSourceTemplateId?: string;
  newCatalogTemplate?: boolean;
}) {
  const isTemplateMode = Boolean(catalogTemplateId) || newCatalogTemplate;
  const router = useRouter();
  const queryClient = useQueryClient();
  const initializedPlanId = useRef<string | null>(null);
  const initializedTemplateId = useRef<string | null>(null);
  const initializedCatalogTemplateId = useRef<string | null>(null);
  const initializedCatalogSourceTemplateId = useRef<string | null>(null);
  const [activeSection, setActiveSection] = useState('lesson-plan-general');
  const [pdfOpen, setPdfOpen] = useState(false);
  const [templatePreview, setTemplatePreview] = useState<LessonTemplate | null>(null);
  const [templateLogo, setTemplateLogo] = useState<File | string | null>(null);
  const [templateLogoPreviewUrl, setTemplateLogoPreviewUrl] = useState('');
  const [templateLogoRemoved, setTemplateLogoRemoved] = useState(false);
  const [aiDialogOpen, setAIDialogOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedFullPlanTemplateName, setSelectedFullPlanTemplateName] = useState('');
  const [tabOrder, setTabOrder] = useState(DEFAULT_TAB_ORDER);
  const [enabledEvaluationSections, setEnabledEvaluationSections] = useState<string[]>([]);

  useEffect(() => {
    if (!(templateLogo instanceof File)) {
      setTemplateLogoPreviewUrl(templateLogo ?? '');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(templateLogo);
    setTemplateLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [templateLogo]);

  useEffect(() => {
    if (isTemplateMode) return;
    const savedOrder = localStorage.getItem(TAB_ORDER_STORAGE_KEY);
    if (!savedOrder) return;

    try {
      const parsed = JSON.parse(savedOrder);
      if (
        Array.isArray(parsed) &&
        parsed.length === DEFAULT_TAB_ORDER.length &&
        DEFAULT_TAB_ORDER.every((tab) => parsed.includes(tab))
      ) {
        setTabOrder(parsed);
      }
    } catch {
      localStorage.removeItem(TAB_ORDER_STORAGE_KEY);
    }
  }, [isTemplateMode]);

  const defaultFormValues = useMemo<LessonPlanFormValues>(
    () => ({
      ...EMPTY_FORM,
      templateSectionContents: legacyValuesToTemplateSections(EMPTY_FORM),
    }),
    []
  );
  const methods = useForm<LessonPlanFormValues>({
    resolver: zodResolver(TemplateLessonPlanSchema) as Resolver<LessonPlanFormValues>,
    defaultValues: defaultFormValues,
    mode: 'onTouched',
  });
  const {
    control,
    handleSubmit,
    getValues,
    reset,
    resetField,
    setValue,
    trigger,
    formState: { dirtyFields },
  } = methods;
  const startDate = useWatch({ control, name: 'startDate' });
  const selectedAssignmentId = useWatch({ control, name: 'teacherAssignmentId' });
  const evaluationStudents = useWatch({ control, name: 'evaluationStudents' });
  const navigationValues = useWatch({ control });

  useEffect(() => {
    const roster = (evaluationStudents ?? []) as EvaluationStudent[];
    const sectionContents = getValues('templateSectionContents');
    let nextSectionContents = { ...sectionContents };
    let sectionContentsChanged = false;
    const configurations = [
      ['lesson-plan-worksheet-assessment-record', 'scoreColumns', 'scores'],
      ['lesson-plan-competency-assessment', 'domains', 'scores'],
      ['lesson-plan-behavior-observation', 'behaviors', 'observations'],
    ] as const;
    configurations.forEach(([tabId, dimensionField, valueField]) => {
      const content = (sectionContents[tabId] ?? {}) as Record<string, unknown>;
      const rows = Array.isArray(content.students)
        ? (content.students as Array<Record<string, unknown>>)
        : [];
      const dimension = Array.isArray(content[dimensionField]) ? content[dimensionField].length : 0;
      const nextRows = roster.map((student, studentIndex) => {
        const current = rows.find((row) => row.id === student.id) ?? rows[studentIndex];
        const currentValues = Array.isArray(current?.[valueField])
          ? (current[valueField] as unknown[])
          : [];
        return {
          ...current,
          id: student.id,
          name: student.name,
          [valueField]: Array.from({ length: dimension }, (_, index) =>
            valueField === 'observations'
              ? Boolean(currentValues[index])
              : Number(currentValues[index] ?? 0)
          ),
        };
      });
      if (JSON.stringify(rows) !== JSON.stringify(nextRows)) {
        nextSectionContents = {
          ...nextSectionContents,
          [tabId]: { ...content, students: nextRows },
        };
        sectionContentsChanged = true;
      }
    });

    const characteristicTabId = 'lesson-plan-desired-characteristic-assessment';
    const characteristicContent = (sectionContents[characteristicTabId] ?? {}) as Record<
      string,
      unknown
    >;
    const characteristicRows = Array.isArray(characteristicContent.students)
      ? (characteristicContent.students as Array<Record<string, unknown>>)
      : [];
    const characteristicGroups = Array.isArray(characteristicContent.characteristicGroups)
      ? (characteristicContent.characteristicGroups as Array<Record<string, unknown>>)
      : [];
    const behaviorCount = characteristicGroups.reduce(
      (total, group) => total + (Array.isArray(group.behaviors) ? group.behaviors.length : 0),
      0
    );
    const nextCharacteristicRows = roster.map((student, studentIndex) => {
      const current =
        characteristicRows.find((row) => row.id === student.id) ?? characteristicRows[studentIndex];
      const scores = Array.isArray(current?.scores) ? current.scores : [];
      return {
        ...current,
        id: student.id,
        name: student.name,
        scores: Array.from({ length: behaviorCount }, (_, index) => Number(scores[index] ?? 0)),
      };
    });
    if (JSON.stringify(characteristicRows) !== JSON.stringify(nextCharacteristicRows)) {
      nextSectionContents = {
        ...nextSectionContents,
        [characteristicTabId]: {
          ...characteristicContent,
          students: nextCharacteristicRows,
        },
      };
      sectionContentsChanged = true;
    }
    if (sectionContentsChanged) {
      setValue('templateSectionContents', nextSectionContents, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [evaluationStudents, getValues, navigationValues.templateSectionContents, setValue]);

  const optionsQuery = useQuery({
    queryKey: ['lesson-plan-options'],
    queryFn: listLessonPlanOptions,
  });
  const planQuery = useQuery({
    queryKey: ['lesson-plan', lessonPlanId],
    queryFn: () => getLessonPlan(lessonPlanId!),
    enabled: Boolean(lessonPlanId),
  });
  const templatesQuery = useQuery({
    queryKey: ['lesson-plan-templates'],
    queryFn: listLessonPlanTemplates,
    enabled: Boolean(templateId) && !lessonPlanId,
  });
  const catalogTemplateQuery = useQuery({
    queryKey: ['lesson-template-document', catalogTemplateId],
    queryFn: () => getTemplateDocument(catalogTemplateId!),
    enabled: Boolean(catalogTemplateId),
  });
  const catalogSourceTemplateQuery = useQuery({
    queryKey: ['lesson-template-document', catalogSourceTemplateId],
    queryFn: () => getTemplateDocument(catalogSourceTemplateId!),
    enabled: Boolean(catalogSourceTemplateId) && !lessonPlanId,
  });
  const aiOptionsQuery = useQuery({
    queryKey: ['lesson-template-options'],
    queryFn: getTemplateOptions,
    enabled: true,
  });
  const templateLearningAreas = useMemo(() => {
    const masterByCode = new Map(
      (aiOptionsQuery.data?.learningAreas ?? []).map((item) => [item.code, item.name])
    );
    return [
      ...new Set([
        ...(aiOptionsQuery.data?.learningAreas ?? []).map((item) => item.name),
        ...(aiOptionsQuery.data?.subjects ?? []).flatMap((subject) =>
          subject.learning_area
            ? [masterByCode.get(subject.learning_area) ?? subject.learning_area]
            : []
        ),
      ]),
    ];
  }, [aiOptionsQuery.data]);
  const templateGradeLevels = useMemo(() => {
    const masterByCode = new Map(
      (aiOptionsQuery.data?.gradeLevels ?? []).map((item) => [item.code, item.name])
    );
    return [
      ...new Set([
        ...(aiOptionsQuery.data?.gradeLevels ?? []).map((item) => item.name),
        ...(aiOptionsQuery.data?.subjects ?? []).flatMap((subject) =>
          subject.grade_levels.map((level) => masterByCode.get(level) ?? level)
        ),
      ]),
    ];
  }, [aiOptionsQuery.data]);
  const templateCoverSubjects = useMemo(() => {
    const learningAreaByCode = new Map(
      (aiOptionsQuery.data?.learningAreas ?? []).map((item) => [item.code, item.name])
    );
    const gradeLevelByCode = new Map(
      (aiOptionsQuery.data?.gradeLevels ?? []).map((item) => [item.code, item.name])
    );
    return (aiOptionsQuery.data?.subjects ?? []).map((subject) => ({
      code: subject.code,
      name: subject.name,
      learningArea: subject.learning_area
        ? (learningAreaByCode.get(subject.learning_area) ?? subject.learning_area)
        : null,
      gradeLevels: subject.grade_levels.map((level) => gradeLevelByCode.get(level) ?? level),
      topics: subject.learning_units_structured.map((unit) => unit.name),
    }));
  }, [aiOptionsQuery.data]);

  useEffect(() => {
    const plan = planQuery.data;
    if (!plan || initializedPlanId.current === plan.id) return;

    const values: LessonPlanFormValues = {
      ...EMPTY_FORM,
      curriculumId: plan.curriculum_id,
      subjectId: plan.subject_id,
      unitId: plan.unit_id,
      gradeLevels: plan.grade_levels ?? [],
      indicatorIds: plan.indicator_ids ?? [],
      learningOutcomeIds: plan.learning_outcome_ids ?? [],
      teacherAssignmentId: plan.teacher_assignment_id,
      title: plan.title,
      unitNumber: plan.unit_number,
      unitName: plan.unit_name,
      durationPeriods: plan.duration_periods,
      startDate: plan.start_date,
      endDate: plan.end_date,
      learningStandards: parseLearningStandardRows(plan.learning_standards),
      milestoneIndicators: parseIndicatorFormRows(plan.milestone_indicators || plan.indicators),
      terminalIndicators: parseIndicatorFormRows(plan.terminal_indicators),
      learningObjectives: parseObjectiveFormGroups(plan.learning_objectives),
      essentialContent: plan.essential_content ?? '',
      learnerCompetencies: plan.learner_competencies ?? '',
      desiredCharacteristics: plan.desired_characteristics ?? '',
      guidingQuestions: plan.guiding_questions ?? '',
      learningActivities: parseLearningActivities(plan.learning_activities),
      learningMedia: parseLearningMedia(plan.learning_media),
      assessment: parseAssessment(plan.assessment),
    };
    const persistedSections = plan.template_section_contents ?? {};
    const persistedStudents = Array.isArray(persistedSections._evaluationStudents)
      ? (persistedSections._evaluationStudents as EvaluationStudent[])
      : values.evaluationStudents;
    reset({
      ...values,
      evaluationStudents: persistedStudents,
      templateSectionContents:
        Object.keys(persistedSections).length > 0
          ? persistedSections
          : legacyValuesToTemplateSections(values),
    });
    initializedPlanId.current = plan.id;
  }, [planQuery.data, reset]);

  useEffect(() => {
    if (!templateId || lessonPlanId || initializedTemplateId.current === templateId) return;
    const template = templatesQuery.data?.find((plan) => plan.id === templateId);
    if (!template) return;

    const values: LessonPlanFormValues = {
      ...EMPTY_FORM,
      curriculumId: template.curriculum_id,
      subjectId: template.subject_id,
      unitId: template.unit_id,
      gradeLevels: template.grade_levels ?? [],
      indicatorIds: template.indicator_ids ?? [],
      learningOutcomeIds: template.learning_outcome_ids ?? [],
      title: `${template.title} (จากเทมเพลต)`.slice(0, 200),
      unitNumber: template.unit_number,
      unitName: template.unit_name,
      durationPeriods: template.duration_periods,
      learningStandards: parseLearningStandardRows(template.learning_standards),
      milestoneIndicators: parseIndicatorFormRows(
        template.milestone_indicators || template.indicators
      ),
      terminalIndicators: parseIndicatorFormRows(template.terminal_indicators),
      learningObjectives: parseObjectiveFormGroups(template.learning_objectives),
      essentialContent: template.essential_content ?? '',
      learnerCompetencies: template.learner_competencies ?? '',
      desiredCharacteristics: template.desired_characteristics ?? '',
      guidingQuestions: template.guiding_questions ?? '',
      learningActivities: parseLearningActivities(template.learning_activities),
      learningMedia: parseLearningMedia(template.learning_media),
      assessment: parseAssessment(template.assessment),
    };
    const persistedSections = template.template_section_contents ?? {};
    const persistedStudents = Array.isArray(persistedSections._evaluationStudents)
      ? (persistedSections._evaluationStudents as EvaluationStudent[])
      : values.evaluationStudents;
    reset({
      ...values,
      evaluationStudents: persistedStudents,
      templateSectionContents:
        Object.keys(persistedSections).length > 0
          ? persistedSections
          : legacyValuesToTemplateSections(values),
    });
    initializedTemplateId.current = templateId;
  }, [lessonPlanId, reset, templateId, templatesQuery.data]);

  useEffect(() => {
    const templateDocument = catalogTemplateQuery.data;
    if (
      !catalogTemplateId ||
      !templateDocument ||
      initializedCatalogTemplateId.current === catalogTemplateId
    )
      return;
    const values = templateDocumentValues(
      templateDocument.template,
      templateDocument.sectionTemplates
    );
    const templateContent = templateDocument.template.content as LessonPlanTemplateContent;
    const enabledEvaluationTabs = EVALUATION_TAB_IDS.filter((tabId) => {
      const templateType = TAB_TEMPLATE_TYPES[tabId];
      const section = templateContent.sections?.find((item) => item.sectionType === templateType);
      return Boolean(section && section.enabled !== false);
    });
    setEnabledEvaluationSections(enabledEvaluationTabs);
    setTemplateLogo(templateContent.cover?.logoUrl ?? null);
    setTemplateLogoRemoved(false);
    reset({ ...values, teacherAssignmentId: '' });
    const savedOrder = templateContent.document?.sectionOrder;
    if (
      savedOrder?.length === DEFAULT_TAB_ORDER.length &&
      DEFAULT_TAB_ORDER.every((tab) => savedOrder.includes(tab))
    ) {
      setTabOrder(savedOrder);
    } else {
      setTabOrder(DEFAULT_TAB_ORDER);
    }
    initializedCatalogTemplateId.current = catalogTemplateId;
  }, [catalogTemplateId, catalogTemplateQuery.data, reset]);

  useEffect(() => {
    if (!newCatalogTemplate || catalogTemplateId || initializedCatalogTemplateId.current) return;
    const freshContent = defaultTemplateContent('lesson_plan') as LessonPlanTemplateContent;
    reset({
      ...EMPTY_FORM,
      templateSectionContents: {
        cover: freshContent.cover,
        ...Object.fromEntries(
          Object.entries(TAB_TEMPLATE_TYPES).map(([tabId, type]) => [
            tabId,
            defaultTemplateContent(type),
          ])
        ),
      },
    });
    setTabOrder(DEFAULT_TAB_ORDER);
    setEnabledEvaluationSections([]);
    initializedCatalogTemplateId.current = '__new__';
  }, [catalogTemplateId, newCatalogTemplate, reset]);

  const markTabClean = (tab?: string) => {
    TAB_FORM_FIELDS[tab ?? '']?.forEach((fieldName) => {
      resetField(fieldName, { defaultValue: getValues(fieldName) });
    });
    if (tab && tab in TAB_TEMPLATE_TYPES) {
      const fieldName = `templateSectionContents.${tab}` as const;
      resetField(fieldName, { defaultValue: getValues(fieldName) });
    }
  };

  const saveMutation = useMutation<
    { kind: 'template'; saved: LessonTemplate } | { kind: 'lesson-plan'; saved: LessonPlan },
    Error,
    {
      values: LessonPlanFormValues;
      saveMode?: 'draft';
      tab?: string;
      publishScope?: PublishTemplateScope;
    }
  >({
    mutationFn: async ({
      values,
      saveMode,
      tab,
      publishScope,
    }: {
      values: LessonPlanFormValues;
      saveMode?: 'draft';
      tab?: string;
      publishScope?: PublishTemplateScope;
    }) => {
      if (isTemplateMode) {
        const withPublication = (input: ReturnType<typeof templateDocumentInput>) => ({
          ...input,
          scope: publishScope ?? input.scope,
          status: publishScope
            ? ('active' as const)
            : saveMode === 'draft'
              ? ('draft' as const)
              : input.status,
        });
        if (catalogTemplateId) {
          const template = catalogTemplateQuery.data?.template;
          if (!template) throw new Error('ยังโหลด Template ไม่สำเร็จ');
          let saved = await updateTemplate(
            catalogTemplateId,
            withPublication(
              templateDocumentInput(values, tabOrder, template, enabledEvaluationSections)
            )
          );
          let logoUrl = ((saved.content as LessonPlanTemplateContent).cover?.logoUrl ?? '').trim();
          if (templateLogo instanceof File) {
            ({ logoUrl } = await uploadTemplateLogo(catalogTemplateId, templateLogo));
          } else if (templateLogoRemoved) {
            await deleteTemplateLogo(catalogTemplateId);
            logoUrl = '';
          }
          const savedContent = saved.content as LessonPlanTemplateContent;
          saved = {
            ...saved,
            content: { ...savedContent, cover: { ...savedContent.cover, logoUrl } },
          };
          return { kind: 'template' as const, saved };
        }

        let saved = await createTemplate(
          withPublication(
            templateDocumentInput(values, tabOrder, undefined, enabledEvaluationSections)
          )
        );
        if (templateLogo instanceof File) {
          const { logoUrl } = await uploadTemplateLogo(saved.id, templateLogo);
          const savedContent = saved.content as LessonPlanTemplateContent;
          saved = {
            ...saved,
            content: { ...savedContent, cover: { ...savedContent.cover, logoUrl } },
          };
        }
        return { kind: 'template' as const, saved };
      }
      const payload = toPayload(templateSectionsToLegacyValues(values));
      const request = lessonPlanId
        ? updateLessonPlan(lessonPlanId, {
            ...payload,
            expectedVersion: planQuery.data!.version_number,
            saveMode,
            tab,
            changeNote: saveMode === 'draft' ? `บันทึก ${tab ?? 'ฉบับร่าง'}` : undefined,
          })
        : createLessonPlan({ ...payload, saveMode, tab });
      return request.then((saved) => ({ kind: 'lesson-plan' as const, saved }));
    },
    onSuccess: async (result, variables) => {
      if (result.kind === 'template') {
        setPublishDialogOpen(false);
        const logoUrl = (result.saved.content as LessonPlanTemplateContent).cover?.logoUrl ?? '';
        setTemplateLogo(logoUrl || null);
        setTemplateLogoRemoved(false);
        const sectionContents = getValues('templateSectionContents');
        setValue(
          'templateSectionContents',
          {
            ...sectionContents,
            cover: {
              ...(sectionContents.cover as LessonPlanTemplateContent['cover']),
              logoUrl,
            },
          },
          { shouldDirty: false }
        );
        markTabClean(variables.tab);

        if (!catalogTemplateId) {
          await queryClient.invalidateQueries({ queryKey: ['lesson-templates'] });
          router.replace(paths.teacher.lessonPlans.templateEdit(result.saved.id));
          toast.success(
            variables.publishScope
              ? variables.publishScope === 'school'
                ? 'เผยแพร่ Template ให้ทั้งโรงเรียนแล้ว'
                : 'เผยแพร่ Template ส่วนตัวแล้ว'
              : variables.saveMode === 'draft'
                ? `บันทึก “${activeNavigationSection.label}” ใน Template แล้ว`
                : 'สร้าง Template แผนการสอนแล้ว'
          );
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['lesson-template-document', catalogTemplateId],
          }),
          queryClient.invalidateQueries({ queryKey: ['lesson-templates'] }),
        ]);
        if (variables.publishScope) {
          toast.success(
            variables.publishScope === 'school'
              ? 'เผยแพร่ Template ให้ทั้งโรงเรียนแล้ว'
              : 'เผยแพร่ Template ส่วนตัวแล้ว'
          );
          router.push(paths.teacher.lessonPlans.templates);
          return;
        }
        if (variables.saveMode === 'draft') {
          toast.success(`บันทึก “${activeNavigationSection.label}” ใน Template แล้ว`);
          return;
        }
        toast.success('บันทึก Template แผนการสอนแล้ว');
        router.push(paths.teacher.lessonPlans.templates);
        return;
      }

      const savedPlan = result.saved;
      if (variables.saveMode === 'draft') {
        markTabClean(variables.tab);
        toast.success(`บันทึก “${activeNavigationSection.label}” เป็นฉบับร่างแล้ว`);
        if (lessonPlanId) {
          queryClient.setQueryData(
            ['lesson-plan', lessonPlanId],
            (current: LessonPlan | undefined) =>
              current ? { ...current, ...savedPlan } : savedPlan
          );
        } else {
          router.replace(paths.teacher.lessonPlans.edit(savedPlan.id));
        }
        return;
      }

      toast.success(lessonPlanId ? 'บันทึกเวอร์ชันใหม่แล้ว' : 'สร้างแผนการสอนแล้ว');
      router.push(paths.teacher.lessonPlans.root);
    },
  });

  const selectedAssignment = optionsQuery.data?.find(
    (option) => option.id === selectedAssignmentId
  );

  const applyCurriculum = useCallback(
    (assignmentId: string) => {
      const assignment = optionsQuery.data?.find((option) => option.id === assignmentId);
      const subject = assignment?.subject;
      if (!subject) return;

      const linkedIndicators = subject.curriculum_indicators ?? [];
      const gradeLevel = assignment?.classroom?.grade_level;
      setValue('curriculumId', subject.curriculum_id, { shouldDirty: true });
      setValue('subjectId', subject.id, { shouldDirty: true });
      setValue('unitId', null, { shouldDirty: true });
      setValue('learningOutcomeIds', [], { shouldDirty: true });
      setValue('gradeLevels', gradeLevel ? [gradeLevel] : (subject.grade_levels ?? []), {
        shouldDirty: true,
      });
      setValue(
        'indicatorIds',
        linkedIndicators.map((indicator) => indicator.id),
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );

      const linkedStandards = [
        ...new Set(
          linkedIndicators
            .map((indicator) => indicator.learning_standard?.trim())
            .filter((value): value is string => Boolean(value))
        ),
      ];
      const standardValues = linkedStandards.length
        ? linkedStandards
        : [subjectLearningStandardText(subject)].filter(Boolean);
      const milestoneValues = linkedIndicators.length
        ? linkedIndicators.map(({ code, description }) => ({ code, description }))
        : parseIndicatorFormRows(plainText(subject.indicators));
      setValue('learningStandards', parseLearningStandardRows(standardValues.join('\n')), {
        shouldDirty: true,
      });
      setValue('milestoneIndicators', milestoneValues, { shouldDirty: true });
      const currentStandards = getValues('templateSectionContents.lesson-plan-standards') as Record<
        string,
        unknown
      >;
      setValue(
        'templateSectionContents.lesson-plan-standards',
        {
          ...currentStandards,
          items: standardValues.map((title) => ({
            id: crypto.randomUUID(),
            code: '',
            title,
            description: '',
          })),
          milestoneIndicators: milestoneValues.map(({ code, description }) => ({
            id: crypto.randomUUID(),
            code,
            title: description,
            description: '',
          })),
        },
        { shouldDirty: true }
      );
    },
    [getValues, optionsQuery.data, setValue]
  );

  const selectAssignment = useCallback(
    (assignmentId: string) => {
      const assignment = optionsQuery.data?.find((option) => option.id === assignmentId);
      const subject = assignment?.subject;

      setValue('teacherAssignmentId', assignmentId, { shouldDirty: true, shouldValidate: true });
      setValue('subjectId', subject?.id ?? null, { shouldDirty: true });
      setValue('curriculumId', subject?.curriculum_id ?? null, { shouldDirty: true });
      setValue(
        'gradeLevels',
        assignment?.classroom?.grade_level
          ? [assignment.classroom.grade_level]
          : (subject?.grade_levels ?? []),
        { shouldDirty: true }
      );
      if (!getValues('title')) {
        setValue('title', subject ? `แผนการสอน ${subject.name}` : '', { shouldDirty: true });
      }
      if (!templateId) applyCurriculum(assignmentId);
    },
    [applyCurriculum, getValues, optionsQuery.data, setValue, templateId]
  );

  const selectUnit = useCallback(
    (unitId: string) => {
      const unit = selectedAssignment?.subject?.learning_units_structured.find(
        (item) => item.id === unitId
      );
      setValue('unitId', unit?.id ?? null, { shouldDirty: true });
      if (!unit) return;
      setValue('unitName', unit.name, { shouldDirty: true, shouldValidate: true });
      if (unit.estimated_periods) {
        setValue('durationPeriods', unit.estimated_periods, { shouldDirty: true });
      }
    },
    [selectedAssignment, setValue]
  );

  const isEditable = !planQuery.data || ['draft', 'revision'].includes(planQuery.data.status);
  const onSubmit = handleSubmit((values) => saveMutation.mutate({ values }));
  const navigationSectionCandidates = [
    {
      id: 'lesson-plan-general',
      label: 'ข้อมูลทั่วไป',
      complete: Boolean(
        (isTemplateMode || navigationValues.teacherAssignmentId) &&
        navigationValues.title?.trim() &&
        navigationValues.unitName?.trim() &&
        navigationValues.durationPeriods
      ),
    },
    {
      id: 'lesson-plan-standards',
      label: 'มาตรฐานและตัวชี้วัด',
      complete:
        Boolean(navigationValues.learningStandards?.some((row) => row.content?.trim())) &&
        Boolean(navigationValues.milestoneIndicators?.length) &&
        Boolean(
          navigationValues.milestoneIndicators?.every((row) => Boolean(row.code && row.description))
        ) &&
        Boolean(navigationValues.terminalIndicators?.length) &&
        Boolean(
          navigationValues.terminalIndicators?.every((row) => Boolean(row.code && row.description))
        ),
    },
    {
      id: 'lesson-plan-objectives',
      label: 'จุดประสงค์การเรียนรู้',
      complete: (() => {
        const groups = navigationValues.learningObjectives ?? [];
        return (
          groups.some((group) => group.items?.some((item) => item.content?.trim())) &&
          groups.every(
            (group) =>
              !group.items?.some((item) => item.content?.trim()) || Boolean(group.label?.trim())
          )
        );
      })(),
    },
    {
      id: 'lesson-plan-essential',
      label: 'สาระสำคัญ',
      complete: Boolean(plainText(navigationValues.essentialContent)),
    },
    {
      id: 'lesson-plan-characteristics',
      label: 'คุณลักษณะอันพึงประสงค์',
      complete: Boolean(plainText(navigationValues.desiredCharacteristics)),
    },
    {
      id: 'lesson-plan-competencies',
      label: 'สมรรถนะสำคัญ',
      complete: Boolean(plainText(navigationValues.learnerCompetencies)),
    },
    {
      id: 'lesson-plan-questions',
      label: 'คำถามหลัก',
      complete: Boolean(plainText(navigationValues.guidingQuestions)),
    },
    {
      id: 'lesson-plan-activities',
      label: 'กิจกรรมการเรียนรู้',
      complete: Boolean(
        navigationValues.learningActivities?.length &&
        navigationValues.learningActivities.every(
          (row) => row?.title?.trim() && plainText(row?.description)
        )
      ),
    },
    {
      id: 'lesson-plan-media',
      label: 'สื่อและแหล่งเรียนรู้',
      complete: Boolean(
        navigationValues.learningMedia?.length &&
        navigationValues.learningMedia.every((item) => item.content?.trim())
      ),
    },
    {
      id: 'lesson-plan-assessment',
      label: 'การวัดและประเมินผล',
      complete: Boolean(
        navigationValues.assessment?.length &&
        navigationValues.assessment.every(
          (row) =>
            row.issue?.trim() && row.method?.trim() && row.tool?.trim() && row.criteria?.trim()
        )
      ),
    },
    {
      id: 'lesson-plan-reflection',
      label: 'บันทึกผลหลังการสอน',
      complete: false,
    },
    {
      id: 'lesson-plan-worksheet-assessment-record',
      label: 'บันทึกผลการประเมินใบงาน',
      complete: false,
    },
    {
      id: 'lesson-plan-desired-characteristic-assessment',
      label: 'แบบประเมินคุณลักษณะอันพึงประสงค์',
      complete: false,
    },
    {
      id: 'lesson-plan-competency-assessment',
      label: 'แบบประเมินสมรรถนะสำคัญของผู้เรียน',
      complete: false,
    },
    {
      id: 'lesson-plan-behavior-observation',
      label: 'แบบสังเกตพฤติกรรม',
      complete: false,
    },
  ];
  const savedTabs = new Set(planQuery.data?.saved_tabs ?? []);
  const navigationSections = navigationSectionCandidates
    .filter(
      (section) =>
        isTemplateMode ||
        ![
          'lesson-plan-reflection',
          'lesson-plan-worksheet-assessment-record',
          'lesson-plan-desired-characteristic-assessment',
          'lesson-plan-competency-assessment',
          'lesson-plan-behavior-observation',
        ].includes(section.id)
    )
    .map((section) => ({
      ...section,
      complete:
        section.id === 'lesson-plan-general'
          ? section.complete
          : hasMeaningfulTemplateStep(
              TAB_TEMPLATE_TYPES[section.id as keyof typeof TAB_TEMPLATE_TYPES],
              navigationValues.templateSectionContents?.[section.id]
            ) &&
            (isTemplateMode || savedTabs.has(section.id)) &&
            !(dirtyFields.templateSectionContents as Record<string, unknown> | undefined)?.[
              section.id
            ],
    }))
    .sort((first, second) => tabOrder.indexOf(first.id) - tabOrder.indexOf(second.id));
  const activeSectionIndex = Math.max(
    navigationSections.findIndex((section) => section.id === activeSection),
    0
  );
  const activeNavigationSection = navigationSections[activeSectionIndex];
  const activeTemplateType = TAB_TEMPLATE_TYPES[activeSection as keyof typeof TAB_TEMPLATE_TYPES];
  const activeTemplateContent = useMemo(
    () =>
      activeTemplateType
        ? ((navigationValues.templateSectionContents?.[activeSection] ??
            defaultTemplateContent(activeTemplateType)) as SectionTemplateContent)
        : defaultTemplateContent('learning_objective'),
    [activeSection, activeTemplateType, navigationValues.templateSectionContents]
  );
  const aiDialogInitial = useMemo(
    () => ({
      name: navigationValues.title?.trim() || 'Template แผนการสอน',
      templateType: activeTemplateType ?? ('learning_objective' as const),
      subjectId: null,
      gradeLevels: navigationValues.gradeLevels ?? [],
      durationMinutes: Math.max(1, Number(navigationValues.durationPeriods ?? 1)) * 50,
      indicatorIds: [],
      content: activeTemplateContent,
      tags: catalogTemplateQuery.data?.template.tags ?? [],
      metadata: catalogTemplateQuery.data?.template.metadata ?? {},
    }),
    [
      activeTemplateContent,
      activeTemplateType,
      catalogTemplateQuery.data?.template.metadata,
      catalogTemplateQuery.data?.template.tags,
      navigationValues.durationPeriods,
      navigationValues.gradeLevels,
      navigationValues.title,
    ]
  );

  const goToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
  }, []);

  const updateTabOrder = useCallback(
    (nextOrder: string[]) => {
      setTabOrder(nextOrder);
      if (!isTemplateMode) localStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(nextOrder));
    },
    [isTemplateMode]
  );

  const moveTab = useCallback(
    (tabId: string, offset: number) => {
      const currentIndex = tabOrder.indexOf(tabId);
      const nextIndex = currentIndex + offset;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= tabOrder.length) return;

      const nextOrder = [...tabOrder];
      [nextOrder[currentIndex], nextOrder[nextIndex]] = [
        nextOrder[nextIndex],
        nextOrder[currentIndex],
      ];
      updateTabOrder(nextOrder);
    },
    [tabOrder, updateTabOrder]
  );

  const handleTabDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || destination.index === source.index) return;

      const nextOrder = navigationSections.map((section) => section.id);
      const [movedTabId] = nextOrder.splice(source.index, 1);
      nextOrder.splice(destination.index, 0, movedTabId);
      updateTabOrder(nextOrder);
    },
    [navigationSections, updateTabOrder]
  );

  const saveCurrentTab = useCallback(async () => {
    const values = getValues();
    if (!isTemplateMode && !values.teacherAssignmentId) {
      toast.warning('กรุณาเลือกรายวิชาและห้องเรียนก่อนบันทึกฉบับร่าง');
      goToSection('lesson-plan-general');
      return;
    }

    const currentTabFields = TAB_FORM_FIELDS[activeSection] ?? [];
    const isCurrentTabValid =
      activeSection === 'lesson-plan-general'
        ? await trigger(currentTabFields, { shouldFocus: true })
        : true;
    if (!isCurrentTabValid) {
      toast.warning('กรุณากรอกข้อมูลใน Step นี้ให้ครบก่อนบันทึก');
      return;
    }

    saveMutation.mutate({ values: getValues(), saveMode: 'draft', tab: activeSection });
  }, [activeSection, getValues, goToSection, isTemplateMode, saveMutation, trigger]);

  const publishTemplate = useCallback(
    async (scope: PublishTemplateScope) => {
      const generalFields = TAB_FORM_FIELDS['lesson-plan-general'] ?? [];
      if (!(await trigger(generalFields, { shouldFocus: true }))) {
        setPublishDialogOpen(false);
        goToSection('lesson-plan-general');
        toast.warning('กรุณากรอกข้อมูลทั่วไปให้ครบก่อนเผยแพร่');
        return;
      }
      saveMutation.mutate({ values: getValues(), publishScope: scope });
    },
    [getValues, goToSection, saveMutation, trigger]
  );

  const onOpenAIDialog = useCallback(() => setAIDialogOpen(true), []);
  const onOpenTemplatePicker = useCallback(() => setTemplatePickerOpen(true), []);
  const onSelectFullPlanTemplate = useCallback(
    async (
      template: LessonTemplate,
      loadedDocument?: Awaited<ReturnType<typeof getTemplateDocument>>
    ) => {
      const document = loadedDocument ?? (await getTemplateDocument(template.id));
      const templateValues = templateDocumentValues(document.template, document.sectionTemplates);
      const currentValues = getValues();
      const hasAssignment = Boolean(currentValues.teacherAssignmentId);
      const content = document.template.content as LessonPlanTemplateContent;
      const enabledEvaluationTabs = EVALUATION_TAB_IDS.filter((tabId) => {
        const templateType = TAB_TEMPLATE_TYPES[tabId];
        const section = content.sections?.find((item) => item.sectionType === templateType);
        return Boolean(section && section.enabled !== false);
      });

      reset({
        ...templateValues,
        teacherAssignmentId: currentValues.teacherAssignmentId,
        curriculumId: hasAssignment ? currentValues.curriculumId : templateValues.curriculumId,
        subjectId: hasAssignment ? currentValues.subjectId : templateValues.subjectId,
        unitId: hasAssignment ? currentValues.unitId : templateValues.unitId,
        gradeLevels: hasAssignment ? currentValues.gradeLevels : templateValues.gradeLevels,
        indicatorIds: hasAssignment ? currentValues.indicatorIds : templateValues.indicatorIds,
        learningOutcomeIds: hasAssignment
          ? currentValues.learningOutcomeIds
          : templateValues.learningOutcomeIds,
        startDate: currentValues.startDate,
        endDate: currentValues.endDate,
      });
      setEnabledEvaluationSections(enabledEvaluationTabs);
      setTemplateLogo(content.cover?.logoUrl ?? null);
      setTemplateLogoRemoved(false);
      const savedOrder = content.document?.sectionOrder;
      setTabOrder(
        savedOrder?.length === DEFAULT_TAB_ORDER.length &&
          DEFAULT_TAB_ORDER.every((tabId) => savedOrder.includes(tabId))
          ? savedOrder
          : DEFAULT_TAB_ORDER
      );
      setSelectedFullPlanTemplateName(template.name);
      setActiveSection('lesson-plan-general');
    },
    [getValues, reset]
  );

  useEffect(() => {
    const document = catalogSourceTemplateQuery.data;
    if (
      !catalogSourceTemplateId ||
      !document ||
      initializedCatalogSourceTemplateId.current === catalogSourceTemplateId
    )
      return;
    initializedCatalogSourceTemplateId.current = catalogSourceTemplateId;
    void onSelectFullPlanTemplate(document.template, document).catch((error: Error) => {
      initializedCatalogSourceTemplateId.current = null;
      toast.error(error.message);
    });
  }, [catalogSourceTemplateId, catalogSourceTemplateQuery.data, onSelectFullPlanTemplate]);

  const onLogoDrop = useCallback((file: File) => {
    setTemplateLogo(file);
    setTemplateLogoRemoved(false);
  }, []);

  const onLogoRemove = useCallback(() => {
    setTemplateLogo(null);
    setTemplateLogoRemoved(true);
    const sectionContents = getValues('templateSectionContents');
    setValue(
      'templateSectionContents',
      {
        ...sectionContents,
        cover: {
          ...(sectionContents.cover as LessonPlanTemplateContent['cover']),
          logoUrl: '',
        },
      },
      { shouldDirty: true }
    );
  }, [getValues, setValue]);

  const onPreviewPdf = useCallback(() => {
    if (isTemplateMode && !catalogTemplateId) {
      toast.warning('กรุณาบันทึก Template อย่างน้อยหนึ่งครั้งก่อนดูตัวอย่าง PDF');
      return;
    }
    if (catalogTemplateId) {
      const currentTemplate = catalogTemplateQuery.data?.template;
      if (!currentTemplate) return;
      const previewInput = templateDocumentInput(
        getValues(),
        tabOrder,
        currentTemplate,
        enabledEvaluationSections
      );
      const previewContent = previewInput.content as LessonPlanTemplateContent;
      setTemplatePreview({
        ...currentTemplate,
        name: previewInput.name,
        description: previewInput.description ?? null,
        template_type: previewInput.templateType,
        scope: previewInput.scope,
        status: previewInput.status,
        content: {
          ...previewContent,
          cover: {
            ...previewContent.cover,
            logoUrl: templateLogoPreviewUrl,
          },
        },
        metadata: previewInput.metadata ?? {},
        tags: previewInput.tags ?? [],
        curriculum_id: previewInput.curriculumId,
        subject_id: previewInput.subjectId ?? null,
        unit_id: previewInput.unitId,
        course_id: previewInput.courseId ?? null,
        grade_levels: previewInput.gradeLevels ?? [],
        indicator_ids: previewInput.indicatorIds ?? [],
        learning_outcome_ids: previewInput.learningOutcomeIds,
      });
    }
    setPdfOpen(true);
  }, [
    catalogTemplateId,
    catalogTemplateQuery.data,
    enabledEvaluationSections,
    getValues,
    isTemplateMode,
    tabOrder,
    templateLogoPreviewUrl,
  ]);

  if (
    planQuery.isLoading ||
    templatesQuery.isLoading ||
    catalogTemplateQuery.isLoading ||
    catalogSourceTemplateQuery.isLoading
  )
    return <LinearProgress />;

  const returnPath = isTemplateMode
    ? paths.teacher.lessonPlans.templates
    : paths.teacher.lessonPlans.root;

  return (
    <Container
      maxWidth={false}
      sx={{
        pb: 3,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100dvh - 64px)',
        '& > form': {
          flex: 1,
          gap: 3,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box>
        <Button
          component={RouterLink}
          href={returnPath}
          color="inherit"
          size="small"
          startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
          sx={{ mb: 1.5, color: 'text.secondary' }}
        >
          {isTemplateMode ? 'กลับไปหน้า Template แผนการสอน' : 'กลับไปหน้าแผนการสอน'}
        </Button>
      </Box>
      <Box
        sx={{
          mb: 2,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            {catalogTemplateId
              ? 'แก้ไข Template แผนการสอน'
              : isTemplateMode
                ? 'สร้าง Template แผนการสอน'
                : lessonPlanId
                  ? 'แก้ไขแผนการสอน'
                  : 'สร้างแผนการสอน'}
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            {catalogTemplateId
              ? 'แก้ไขหัวข้อและเนื้อหาตั้งต้นที่จะนำไปใช้สร้างแผนการสอน'
              : isTemplateMode
                ? 'กำหนดหัวข้อและเนื้อหาตั้งต้นที่จะนำไปใช้สร้างแผนการสอน'
                : 'เลือกรายวิชาที่ได้รับมอบหมาย ระบบจะเติมหลักสูตรและตัวชี้วัดตั้งต้นให้อัตโนมัติ'}
          </Typography>
        </Box>
        {!isTemplateMode && !lessonPlanId ? (
          <Button
            size="large"
            variant="contained"
            startIcon={<RemixIcon icon="solar:documents-linear" />}
            onClick={onOpenTemplatePicker}
            sx={{ flexShrink: 0 }}
          >
            เลือกจาก Template
          </Button>
        ) : null}
      </Box>

      {planQuery.data?.review_note ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ข้อเสนอแนะจากฝ่ายวิชาการ: {planQuery.data.review_note}
        </Alert>
      ) : null}
      {templateId && initializedTemplateId.current === templateId ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          โหลดข้อมูลจากเทมเพลตแล้ว กรุณาเลือกรายวิชาและห้องเรียนก่อนบันทึก
        </Alert>
      ) : null}
      {selectedFullPlanTemplateName ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          ใช้ Template “{selectedFullPlanTemplateName}” เป็นข้อมูลตั้งต้นแล้ว
          กรุณาเลือกรายวิชาและห้องเรียนก่อนบันทึก
        </Alert>
      ) : null}

      {saveMutation.isError ||
      optionsQuery.isError ||
      planQuery.isError ||
      templatesQuery.isError ||
      catalogTemplateQuery.isError ||
      catalogSourceTemplateQuery.isError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveMutation.error?.message ??
            optionsQuery.error?.message ??
            planQuery.error?.message ??
            templatesQuery.error?.message ??
            catalogTemplateQuery.error?.message ??
            catalogSourceTemplateQuery.error?.message}
        </Alert>
      ) : null}

      <Form methods={methods} onSubmit={onSubmit}>
        <Box
          sx={{
            gap: 3,
            display: 'grid',
            alignItems: 'start',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '300px minmax(0, 1fr)' },
          }}
        >
          <LessonPlanTabNav
            sections={navigationSections}
            activeSection={activeSection}
            onSelect={goToSection}
            onMove={moveTab}
            onDragEnd={handleTabDragEnd}
            evaluationSectionIds={isTemplateMode ? EVALUATION_TAB_IDS : []}
            enabledEvaluationSections={enabledEvaluationSections}
            onToggleEvaluationSection={(tabId) =>
              setEnabledEvaluationSections((current) =>
                current.includes(tabId)
                  ? current.filter((item) => item !== tabId)
                  : [...current, tabId]
              )
            }
          />

          <Box sx={{ gap: 3, display: 'grid' }}>
            {activeSection === 'lesson-plan-general' && (
              <GeneralTab
                isTemplateMode={isTemplateMode}
                isEditable={isEditable}
                isSaving={saveMutation.isPending}
                assignmentOptions={optionsQuery.data ?? []}
                selectedAssignment={selectedAssignment}
                onSelectAssignment={selectAssignment}
                onSelectUnit={selectUnit}
                startDate={startDate}
                templateCoverSubjects={templateCoverSubjects}
                templateLearningAreas={templateLearningAreas}
                templateGradeLevels={templateGradeLevels}
                academicYears={aiOptionsQuery.data?.academicYears}
                semesters={aiOptionsQuery.data?.semesters}
                templateLogo={templateLogo}
                onLogoDrop={onLogoDrop}
                onLogoRemove={onLogoRemove}
              />
            )}

            {activeTemplateType ? (
              <TemplateContentTab
                activeSection={activeSection}
                activeTemplateType={activeTemplateType}
                isTemplateMode={isTemplateMode}
                isEditable={isEditable}
                templateOptions={aiOptionsQuery.data?.templates ?? []}
                objectiveContent={
                  navigationValues.templateSectionContents?.[
                    'lesson-plan-objectives'
                  ] as LearningObjectiveContent
                }
                aiEnabled={Boolean(aiOptionsQuery.data?.aiEnabled)}
                onOpenAIDialog={onOpenAIDialog}
              />
            ) : null}
          </Box>
        </Box>

        <LessonPlanFooterBar
          title={navigationValues.title?.trim() || 'ยังไม่ได้ระบุชื่อแผน'}
          stepIndex={activeSectionIndex + 1}
          stepCount={navigationSections.length}
          statusLabel={
            isTemplateMode
              ? 'Template'
              : planQuery.data?.status === 'revision'
                ? 'ฉบับแก้ไข'
                : 'ฉบับร่าง'
          }
          versionLabel={
            catalogTemplateQuery.data?.template.version ?? planQuery.data?.version_number ?? 1
          }
          activeTabLabel={activeNavigationSection.label}
          showTemplatePickerButton={
            !lessonPlanId || (Boolean(lessonPlanId) && activeSection in TAB_TEMPLATE_TYPES)
          }
          isEditable={isEditable}
          isSaving={saveMutation.isPending}
          showPublishButton={isTemplateMode}
          saveLabel={isTemplateMode ? 'บันทึกฉบับร่าง' : 'บันทึก'}
          returnPath={returnPath}
          onOpenTemplatePicker={onOpenTemplatePicker}
          onPreviewPdf={onPreviewPdf}
          onSaveTab={saveCurrentTab}
          onPublish={() => setPublishDialogOpen(true)}
        />
      </Form>

      <TemplatePublishDialog
        open={publishDialogOpen}
        loading={saveMutation.isPending}
        canPublishSchool={Boolean(aiOptionsQuery.data?.canManageSchool)}
        initialScope={
          catalogTemplateQuery.data?.template.scope === 'school' ? 'school' : 'personal'
        }
        onClose={() => setPublishDialogOpen(false)}
        onPublish={publishTemplate}
      />

      {activeTemplateType ? (
        <TemplateAIDialog
          open={aiDialogOpen}
          lockTemplateType
          defaultAction="improve"
          onClose={() => setAIDialogOpen(false)}
          subjects={aiOptionsQuery.data?.subjects ?? []}
          indicators={aiOptionsQuery.data?.indicators ?? []}
          initial={aiDialogInitial}
          onApply={(result: TemplateAIResult) => {
            setValue(`templateSectionContents.${activeSection}`, result.content, {
              shouldDirty: true,
            });
            setAIDialogOpen(false);
            toast.success(
              `นำผลลัพธ์ AI มาใส่ใน Step “${TAB_LABELS[activeSection]}” แล้ว กรุณาตรวจสอบก่อนบันทึก`
            );
          }}
        />
      ) : null}

      {pdfOpen && catalogTemplateId && templatePreview ? (
        <Dialog
          open
          fullWidth
          maxWidth="xl"
          onClose={() => {
            setPdfOpen(false);
            setTemplatePreview(null);
          }}
        >
          <DialogTitle>พรีวิว PDF · {templatePreview.name}</DialogTitle>
          <DialogContent dividers sx={{ p: 0, bgcolor: 'grey.100' }}>
            <LessonPlanTemplatePdfViewer
              template={templatePreview}
              sectionTemplates={catalogTemplateQuery.data?.sectionTemplates ?? []}
              onPdfReady={() => undefined}
            />
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setPdfOpen(false);
                setTemplatePreview(null);
              }}
            >
              ปิด
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {pdfOpen && !isTemplateMode ? (
        <LessonPlanPdfDialog
          open
          onClose={() => setPdfOpen(false)}
          plan={toPayload(templateSectionsToLegacyValues(getValues()))}
          assignment={selectedAssignment}
          version={
            catalogTemplateQuery.data?.template.version ?? planQuery.data?.version_number ?? 1
          }
        />
      ) : null}

      {templatePickerOpen && (!lessonPlanId || activeSection in TAB_TEMPLATE_TYPES) ? (
        <LessonPlanTemplatePickerDialog
          open
          onClose={() => setTemplatePickerOpen(false)}
          lessonPlanId={lessonPlanId}
          templateType={
            lessonPlanId
              ? TAB_TEMPLATE_TYPES[activeSection as keyof typeof TAB_TEMPLATE_TYPES]
              : 'lesson_plan'
          }
          onSelectTemplate={lessonPlanId ? undefined : onSelectFullPlanTemplate}
          onApplied={
            lessonPlanId
              ? async () => {
                  initializedPlanId.current = null;
                  await planQuery.refetch();
                }
              : undefined
          }
        />
      ) : null}
    </Container>
  );
}
