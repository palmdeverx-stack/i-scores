'use client';

import type { TemplateAIAction } from 'src/features/ai/types/ai.types';
import type { TemplateType, TemplateInput, LessonPlanTemplateContent } from '../types';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { TemplateAIDialog } from 'src/features/ai/components/template-ai-dialog';

import { toast } from 'src/components/snackbar';
import { UploadAvatar } from 'src/components/upload';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import { parseTemplateInput } from '../schemas';
import { defaultTemplateContent } from '../template-defaults';
import { TemplatePreview } from '../components/template-preview';
import { TemplateCoverFields } from '../components/template-cover-fields';
import { TemplateContentFields } from '../components/template-content-fields';
import { GRADE_LEVELS, TEMPLATE_TYPES, TEMPLATE_TYPE_LABELS } from '../constants';
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  getTemplateById,
  deleteTemplateLogo,
  getTemplateOptions,
  uploadTemplateLogo,
} from '../template-actions';

const DEFAULT_DRAFT_STORAGE_KEY = 'lesson-template-create-draft-v1';
const LOGO_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

const SUBJECT_SCOPE_LABELS = {
  system: 'ระบบ',
  personal: 'ส่วนตัว',
  school: 'โรงเรียน',
  public: 'สาธารณะ',
} as const;

function createDefaults(type: TemplateType = 'learning_objective'): TemplateInput {
  return {
    name: '',
    description: '',
    templateType: type,
    scope: 'personal',
    status: 'draft',
    content: defaultTemplateContent(type),
    metadata: {
      teachingMethods: [],
      bloomLevels: [],
      competencyIds: [],
      characteristicIds: [],
      keywords: [],
      suitableFor: [],
      estimatedMinutes: undefined,
    },
    tags: [],
    curriculumId: null,
    subjectId: null,
    unitId: null,
    courseId: null,
    gradeLevels: [],
    indicatorIds: [],
    learningOutcomeIds: [],
    aiGeneration: undefined,
  };
}

export function TemplateFormView({
  templateId,
  initialTemplateType = 'learning_objective',
  lockTemplateType = false,
  returnPath = paths.teacher.lessonPlans.templates,
  draftStorageKey = DEFAULT_DRAFT_STORAGE_KEY,
}: {
  templateId?: string;
  initialTemplateType?: TemplateType;
  lockTemplateType?: boolean;
  returnPath?: string;
  draftStorageKey?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initializedId = useRef<string | null>(null);
  const hydratedSectionContentId = useRef<string | null>(null);
  const methods = useForm<TemplateInput>({
    defaultValues: createDefaults(initialTemplateType),
  });
  const [aiDialogOpen, setAIDialogOpen] = useState(false);
  const [templateLogo, setTemplateLogo] = useState<File | string | null>(null);
  const [templateLogoPreviewUrl, setTemplateLogoPreviewUrl] = useState('');
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [editorSection, setEditorSection] = useState<'general' | 'structure' | 'preview'>(
    'general'
  );
  const {
    control,
    reset,
    setValue,
    handleSubmit,
    formState: { isDirty },
  } = methods;
  const templateType = useWatch({ control, name: 'templateType' });
  const content = useWatch({ control, name: 'content' });
  const subjectId = useWatch({ control, name: 'subjectId' });
  const name = useWatch({ control, name: 'name' });
  const gradeLevels = useWatch({ control, name: 'gradeLevels' });
  const indicatorIds = useWatch({ control, name: 'indicatorIds' });
  const metadata = useWatch({ control, name: 'metadata' });
  const tags = useWatch({ control, name: 'tags' });
  const aiGeneration = useWatch({ control, name: 'aiGeneration' });
  const isFullPlanEditor = lockTemplateType && templateType === 'lesson_plan';
  const previewContent = useMemo(() => {
    if (!isFullPlanEditor) return content as Record<string, unknown>;
    const lessonPlanContent = content as LessonPlanTemplateContent;
    return {
      ...lessonPlanContent,
      cover: { ...lessonPlanContent.cover, logoUrl: templateLogoPreviewUrl },
    } as unknown as Record<string, unknown>;
  }, [content, isFullPlanEditor, templateLogoPreviewUrl]);
  const aiDialogInitial = useMemo(
    () => ({
      name: name ?? '',
      templateType,
      subjectId,
      gradeLevels: gradeLevels ?? [],
      teachingMethod: metadata?.teachingMethods?.[0],
      durationMinutes: metadata?.estimatedMinutes,
      indicatorIds: indicatorIds ?? [],
      content: content ?? defaultTemplateContent(templateType),
      tags: tags ?? [],
      metadata: metadata ?? {},
    }),
    [content, gradeLevels, indicatorIds, metadata, name, subjectId, tags, templateType]
  );

  const templateQuery = useQuery({
    queryKey: ['lesson-template', templateId],
    queryFn: () => getTemplateById(templateId!),
    enabled: !!templateId,
  });
  const optionsQuery = useQuery({
    queryKey: ['lesson-template-options'],
    queryFn: getTemplateOptions,
  });
  const selectedSubject = optionsQuery.data?.subjects.find((subject) => subject.id === subjectId);
  const learningAreaNames = useMemo(() => {
    const masterByCode = new Map(
      (optionsQuery.data?.learningAreas ?? []).map((item) => [item.code, item.name])
    );
    return [
      ...new Set([
        ...(optionsQuery.data?.learningAreas ?? []).map((item) => item.name),
        ...(optionsQuery.data?.subjects ?? []).flatMap((subject) =>
          subject.learning_area
            ? [masterByCode.get(subject.learning_area) ?? subject.learning_area]
            : []
        ),
      ]),
    ];
  }, [optionsQuery.data]);
  const gradeLevelNames = useMemo(() => {
    const masterByCode = new Map(
      (optionsQuery.data?.gradeLevels ?? []).map((item) => [item.code, item.name])
    );
    return [
      ...new Set([
        ...(optionsQuery.data?.gradeLevels ?? []).map((item) => item.name),
        ...(optionsQuery.data?.subjects ?? []).flatMap((subject) =>
          subject.grade_levels.map((level) => masterByCode.get(level) ?? level)
        ),
      ]),
    ];
  }, [optionsQuery.data]);
  const coverSubjects = useMemo(() => {
    const learningAreaByCode = new Map(
      (optionsQuery.data?.learningAreas ?? []).map((item) => [item.code, item.name])
    );
    const gradeLevelByCode = new Map(
      (optionsQuery.data?.gradeLevels ?? []).map((item) => [item.code, item.name])
    );
    return (optionsQuery.data?.subjects ?? []).map((subject) => ({
      code: subject.code,
      name: subject.name,
      learningArea: subject.learning_area
        ? (learningAreaByCode.get(subject.learning_area) ?? subject.learning_area)
        : null,
      gradeLevels: subject.grade_levels.map((level) => gradeLevelByCode.get(level) ?? level),
      topics: subject.learning_units_structured.map((unit) => unit.name),
    }));
  }, [optionsQuery.data]);

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
    if (templateId || initializedId.current) return;
    initializedId.current = 'new';
    const saved = localStorage.getItem(draftStorageKey);
    if (!saved) return;
    try {
      reset(parseTemplateInput(JSON.parse(saved)) as TemplateInput);
      toast.info('กู้คืนฉบับร่างที่บันทึกอัตโนมัติแล้ว');
    } catch {
      localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, reset, templateId]);

  useEffect(() => {
    const template = templateQuery.data;
    if (!template || initializedId.current === template.id) return;
    initializedId.current = template.id;
    const lessonPlanContent = template.content as LessonPlanTemplateContent;
    setTemplateLogo(lessonPlanContent.cover?.logoUrl ?? null);
    setLogoRemoved(false);
    const contentWithoutLegacyDocument =
      template.template_type === 'lesson_plan'
        ? { cover: lessonPlanContent.cover, sections: lessonPlanContent.sections }
        : template.content;
    reset({
      name: template.name,
      description: template.description ?? '',
      templateType: template.template_type,
      scope: template.scope === 'school' ? 'school' : 'personal',
      status: template.status,
      content: contentWithoutLegacyDocument,
      metadata: template.metadata,
      tags: template.tags,
      subjectId: template.template_type === 'lesson_plan' ? null : template.subject_id,
      curriculumId: template.template_type === 'lesson_plan' ? null : template.curriculum_id,
      unitId: template.template_type === 'lesson_plan' ? null : template.unit_id,
      courseId: template.template_type === 'lesson_plan' ? null : template.course_id,
      gradeLevels: template.grade_levels,
      indicatorIds: template.template_type === 'lesson_plan' ? [] : template.indicator_ids,
      learningOutcomeIds:
        template.template_type === 'lesson_plan' ? [] : template.learning_outcome_ids,
      aiGeneration: template.is_ai_generated
        ? {
            isAIGenerated: true,
            aiProvider: template.ai_provider ?? undefined,
            aiModel: template.ai_model ?? undefined,
            aiGeneratedAt: template.ai_generated_at ?? undefined,
            aiAction: (template.ai_action as TemplateAIAction | null) ?? undefined,
            aiRequestId: template.ai_request_id ?? undefined,
          }
        : undefined,
    });
  }, [reset, templateQuery.data]);

  useEffect(() => {
    const template = templateQuery.data;
    const templateOptions = optionsQuery.data?.templates;
    if (
      !template ||
      template.template_type !== 'lesson_plan' ||
      !templateOptions ||
      initializedId.current !== template.id ||
      hydratedSectionContentId.current === template.id
    )
      return;

    hydratedSectionContentId.current = template.id;
    const currentContent = methods.getValues('content') as LessonPlanTemplateContent;
    const optionById = new Map(templateOptions.map((option) => [option.id, option]));
    const sections = currentContent.sections.map((section) => ({
      ...section,
      content:
        section.content ??
        (section.templateId ? optionById.get(section.templateId)?.content : undefined) ??
        defaultTemplateContent(section.sectionType),
    }));
    setValue('content', { ...currentContent, sections }, { shouldDirty: false });
  }, [methods, optionsQuery.data?.templates, setValue, templateQuery.data]);

  useEffect(() => {
    if (templateId || !isDirty) return undefined;
    const timer = window.setTimeout(
      () => localStorage.setItem(draftStorageKey, JSON.stringify(methods.getValues())),
      800
    );
    return () => window.clearTimeout(timer);
  }, [content, draftStorageKey, isDirty, methods, templateId, templateType]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: async (input: TemplateInput) => {
      const saved = templateId
        ? await updateTemplate(templateId, input)
        : await createTemplate(input);
      try {
        if (templateLogo instanceof File) {
          await uploadTemplateLogo(saved.id, templateLogo);
        } else if (templateId && logoRemoved) {
          await deleteTemplateLogo(saved.id);
        }
      } catch (error) {
        if (!templateId) await deleteTemplate(saved.id);
        throw error;
      }
      return saved;
    },
    onSuccess: async (saved) => {
      localStorage.removeItem(draftStorageKey);
      toast.success(templateId ? 'บันทึกการแก้ไขแล้ว' : 'สร้าง Template แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['lesson-templates'] });
      router.push(returnPath);
      router.refresh();
      reset({ ...methods.getValues(), name: saved.name });
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit((values) => {
    try {
      const normalizedValues = isFullPlanEditor
        ? {
            ...values,
            curriculumId: null,
            subjectId: null,
            unitId: null,
            courseId: null,
            indicatorIds: [],
            learningOutcomeIds: [],
          }
        : values;
      saveMutation.mutate(parseTemplateInput(normalizedValues) as TemplateInput);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'กรุณาตรวจสอบข้อมูล');
    }
  });

  if (templateQuery.isLoading) return <LinearProgress />;
  if (templateQuery.isError)
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{templateQuery.error.message}</Alert>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {isFullPlanEditor ? (
        <Button
          component={RouterLink}
          href={returnPath}
          color="inherit"
          size="small"
          startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
          sx={{ mb: 1.5, color: 'text.secondary' }}
        >
          กลับไปหน้า Template แผนการสอน
        </Button>
      ) : null}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            {templateId
              ? 'แก้ไข Template'
              : lockTemplateType
                ? 'สร้าง Template แผนการสอนฉบับเต็ม'
                : 'สร้าง Template'}
          </Typography>
          <Typography color="text.secondary">
            {lockTemplateType
              ? 'กำหนดโครงสร้างทุก Section สำหรับนำไปใช้เป็นแผนทั้งฉบับ'
              : 'สร้างองค์ประกอบที่นำกลับมาใช้ซ้ำในแผนการสอนได้'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!templateId && isDirty ? (
            <Typography variant="caption" color="success.main">
              บันทึกฉบับร่างในอุปกรณ์อัตโนมัติ
            </Typography>
          ) : null}
          {optionsQuery.data?.aiEnabled ? (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<RemixIcon icon="solar:magic-stick-3-linear" />}
              onClick={() => setAIDialogOpen(true)}
            >
              สร้างด้วย AI
            </Button>
          ) : null}
        </Box>
      </Box>
      <Form methods={methods} onSubmit={submit}>
        <Box
          sx={{
            gap: 3,
            display: 'grid',
            alignItems: 'start',
            gridTemplateColumns: isFullPlanEditor
              ? { xs: '1fr', md: '300px minmax(0, 1fr)' }
              : { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(320px, 0.6fr)' },
          }}
        >
          {isFullPlanEditor ? (
            <Card
              component="nav"
              variant="outlined"
              aria-label="หัวข้อ Template แผนการสอน"
              sx={{
                p: 0,
                top: 88,
                border: 0,
                boxShadow: 'none',
                borderRadius: 0,
                position: { md: 'sticky' },
              }}
            >
              <Typography variant="subtitle2" sx={{ px: 1.25, py: 1 }}>
                หัวข้อ Template
              </Typography>
              <Box
                sx={{
                  gap: 1,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: '1fr' },
                }}
              >
                {[
                  {
                    value: 'general' as const,
                    label: 'ข้อมูล Template',
                    icon: 'solar:document-text-linear',
                  },
                  {
                    value: 'structure' as const,
                    label: 'หัวข้อแผนการสอน',
                    icon: 'solar:list-check-linear',
                  },
                  {
                    value: 'preview' as const,
                    label: 'Preview',
                    icon: 'solar:eye-linear',
                  },
                ].map((section) => {
                  const active = editorSection === section.value;
                  return (
                    <Button
                      key={section.value}
                      color={active ? 'primary' : 'inherit'}
                      variant={active ? 'contained' : 'text'}
                      onClick={() => setEditorSection(section.value)}
                      startIcon={<RemixIcon icon={section.icon} />}
                      sx={{ justifyContent: 'flex-start', py: 1.25 }}
                    >
                      {section.label}
                    </Button>
                  );
                })}
              </Box>
            </Card>
          ) : null}

          <Box
            sx={{
              gap: 3,
              display: isFullPlanEditor && editorSection === 'preview' ? 'none' : 'grid',
              gridColumn: isFullPlanEditor ? { md: 2 } : undefined,
            }}
          >
            <Card
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 3 },
                gap: 2,
                display: !isFullPlanEditor || editorSection === 'general' ? 'grid' : 'none',
              }}
            >
              <Typography variant="h5">ข้อมูลทั่วไป</Typography>
              <Field.Text required name="name" label="ชื่อ Template" />
              <Box
                sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
              >
                <Field.Select
                  required
                  disabled={lockTemplateType}
                  name="templateType"
                  label="ประเภท Template"
                  onChange={(event) => {
                    const next = event.target.value as TemplateType;
                    setValue('templateType', next, { shouldDirty: true });
                    setValue('content', defaultTemplateContent(next), { shouldDirty: true });
                  }}
                >
                  {TEMPLATE_TYPES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Select name="scope" label="ขอบเขตการใช้งาน">
                  <MenuItem value="personal">ส่วนตัว</MenuItem>
                  {optionsQuery.data?.canManageSchool ? (
                    <MenuItem value="school">โรงเรียน</MenuItem>
                  ) : null}
                </Field.Select>
                <Field.Select name="status" label="สถานะ">
                  <MenuItem value="draft">ฉบับร่าง</MenuItem>
                  <MenuItem value="active">ใช้งาน</MenuItem>
                  <MenuItem value="archived">เก็บถาวร</MenuItem>
                </Field.Select>
                {!isFullPlanEditor ? (
                  <>
                    <Field.Select
                      name="subjectId"
                      label="รายวิชา"
                      onChange={(event) => {
                        const nextSubjectId = event.target.value || null;
                        const nextSubject = optionsQuery.data?.subjects.find(
                          (subject) => subject.id === nextSubjectId
                        );
                        setValue('subjectId', nextSubjectId, { shouldDirty: true });
                        setValue('curriculumId', nextSubject?.curriculum_id ?? null, {
                          shouldDirty: true,
                        });
                        setValue('unitId', null, { shouldDirty: true });
                        setValue('indicatorIds', [], { shouldDirty: true });
                        setValue('learningOutcomeIds', [], { shouldDirty: true });
                        if (nextSubject?.grade_levels.length) {
                          setValue('gradeLevels', nextSubject.grade_levels, { shouldDirty: true });
                        }
                      }}
                    >
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      {(optionsQuery.data?.subjects ?? []).map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.code ? `${subject.code} · ` : ''}
                          {subject.name}
                          {subject.scope ? ` (${SUBJECT_SCOPE_LABELS[subject.scope]})` : ''}
                        </MenuItem>
                      ))}
                    </Field.Select>
                    {selectedSubject?.learning_units_structured.length ? (
                      <Field.Select
                        name="unitId"
                        label="หน่วยการเรียนรู้"
                        onChange={(event) =>
                          setValue('unitId', event.target.value || null, { shouldDirty: true })
                        }
                      >
                        <MenuItem value="">ไม่ระบุ</MenuItem>
                        {selectedSubject.learning_units_structured.map((unit) => (
                          <MenuItem key={unit.id} value={unit.id}>
                            {unit.code ? `${unit.code} · ` : ''}
                            {unit.name}
                          </MenuItem>
                        ))}
                      </Field.Select>
                    ) : null}
                    <TextField
                      disabled
                      label="กลุ่มสาระ"
                      value={selectedSubject?.learning_area || 'เลือกจากรายวิชา'}
                    />
                  </>
                ) : null}
              </Box>
              {isFullPlanEditor ? (
                <Box
                  sx={{
                    gap: 2,
                    p: 2,
                    display: 'grid',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 190px' },
                  }}
                >
                  <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                    <Typography variant="h6">ข้อมูลหน้าปกตัวอย่าง</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ใช้แสดงตัวอย่างใน PDF เท่านั้น เมื่อสร้างแผนจริงระบบจะใช้ข้อมูลจากรายวิชา
                      ห้องเรียน และผู้สอน
                    </Typography>
                  </Box>
                  <TemplateCoverFields
                    prefix="content.cover"
                    learningAreaField="content.cover.learningArea"
                    subjects={coverSubjects}
                    learningAreas={learningAreaNames}
                    gradeLevels={gradeLevelNames}
                    academicYears={optionsQuery.data?.academicYears}
                    semesters={optionsQuery.data?.semesters}
                  />
                  <Box
                    sx={{
                      gap: 1,
                      display: 'flex',
                      alignItems: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography variant="subtitle2">โลโก้บนเอกสาร</Typography>
                    <UploadAvatar
                      value={templateLogo}
                      accept={LOGO_ACCEPT}
                      maxSize={MAX_LOGO_SIZE}
                      disabled={saveMutation.isPending}
                      onDrop={(files) => {
                        const file = files[0];
                        if (!file) return;
                        setTemplateLogo(file);
                        setLogoRemoved(false);
                      }}
                      sx={{ width: 128, height: 128 }}
                    />
                    {templateLogo ? (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          setTemplateLogo(null);
                          setLogoRemoved(true);
                          setValue('content.cover.logoUrl', '', { shouldDirty: true });
                        }}
                      >
                        ลบโลโก้
                      </Button>
                    ) : null}
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      PNG, JPEG หรือ WEBP ไม่เกิน 2MB
                    </Typography>
                  </Box>
                </Box>
              ) : null}
              <Field.Text multiline minRows={3} name="description" label="คำอธิบาย" />
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={field.value ?? []}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField {...params} label="Tags" helperText="พิมพ์แล้วกด Enter" />
                    )}
                  />
                )}
              />
              <Controller
                name="gradeLevels"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={GRADE_LEVELS}
                    value={field.value ?? []}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => <TextField {...params} label="ระดับชั้น" />}
                  />
                )}
              />
              <Box
                sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
              >
                <Field.Text
                  type="number"
                  name="metadata.estimatedMinutes"
                  label="ระยะเวลาโดยประมาณ (นาที)"
                />
                <Controller
                  name="metadata.teachingMethods"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[]}
                      value={field.value ?? []}
                      onChange={(_, value) => field.onChange(value)}
                      renderInput={(params) => <TextField {...params} label="รูปแบบการสอน" />}
                    />
                  )}
                />
              </Box>
              <Controller
                name="metadata.keywords"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={field.value ?? []}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField {...params} label="Keywords สำหรับค้นหา/AI" />
                    )}
                  />
                )}
              />
              {!isFullPlanEditor ? (
                <>
                  <Controller
                    name="indicatorIds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={(optionsQuery.data?.indicators ?? []).filter(
                          (indicator) => !subjectId || indicator.subject_id === subjectId
                        )}
                        value={(optionsQuery.data?.indicators ?? []).filter((indicator) =>
                          (field.value ?? []).includes(indicator.id)
                        )}
                        getOptionLabel={(option) => `${option.code} · ${option.description}`}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, value) => field.onChange(value.map((item) => item.id))}
                        renderInput={(params) => (
                          <TextField {...params} label="ตัวชี้วัดที่เกี่ยวข้อง" />
                        )}
                      />
                    )}
                  />
                  {selectedSubject?.learning_outcomes_structured.length ? (
                    <Controller
                      name="learningOutcomeIds"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          options={selectedSubject.learning_outcomes_structured}
                          value={selectedSubject.learning_outcomes_structured.filter((item) =>
                            field.value.includes(item.id)
                          )}
                          getOptionLabel={(option) =>
                            `${option.code ? `${option.code} · ` : ''}${option.description}`
                          }
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          onChange={(_, value) => field.onChange(value.map((item) => item.id))}
                          renderInput={(params) => (
                            <TextField {...params} label="ผลลัพธ์การเรียนรู้ที่เกี่ยวข้อง" />
                          )}
                        />
                      )}
                    />
                  ) : null}
                </>
              ) : null}
              <Box
                sx={{
                  gap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                <Controller
                  name="metadata.competencyIds"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[]}
                      value={field.value ?? []}
                      onChange={(_, value) => field.onChange(value)}
                      renderInput={(params) => (
                        <TextField {...params} label="สมรรถนะที่เกี่ยวข้อง" />
                      )}
                    />
                  )}
                />
                <Controller
                  name="metadata.characteristicIds"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[]}
                      value={field.value ?? []}
                      onChange={(_, value) => field.onChange(value)}
                      renderInput={(params) => (
                        <TextField {...params} label="คุณลักษณะอันพึงประสงค์" />
                      )}
                    />
                  )}
                />
              </Box>
            </Card>
            <Card
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 3 },
                gap: 2,
                display: !isFullPlanEditor || editorSection === 'structure' ? 'grid' : 'none',
              }}
            >
              <Box>
                <Typography variant="h5">เนื้อหา: {TEMPLATE_TYPE_LABELS[templateType]}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ฟอร์มจะเปลี่ยนตามประเภท Template
                </Typography>
              </Box>
              <Divider />
              <TemplateContentFields
                templateType={templateType}
                templateOptions={optionsQuery.data?.templates ?? []}
              />
            </Card>
          </Box>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              display: !isFullPlanEditor || editorSection === 'preview' ? 'block' : 'none',
              gridColumn: isFullPlanEditor ? { md: 2 } : undefined,
              position: isFullPlanEditor ? 'static' : { lg: 'sticky' },
              top: isFullPlanEditor ? undefined : { lg: 88 },
            }}
          >
            <Box
              sx={{
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography variant="h5">Preview</Typography>
              {aiGeneration?.isAIGenerated ? (
                <Chip color="secondary" size="small" label="สร้างด้วย AI" />
              ) : null}
            </Box>
            <TemplatePreview
              templateType={templateType}
              templateName={name}
              content={previewContent}
            />
            {aiGeneration?.isAIGenerated ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                เนื้อหานี้สร้างโดย AI กรุณาตรวจสอบความถูกต้องก่อนนำไปใช้
              </Alert>
            ) : null}
          </Card>
        </Box>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            mt: 3,
            bottom: 16,
            zIndex: 5,
            position: 'sticky',
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end',
            boxShadow: (theme) => theme.vars.customShadows.z8,
          }}
        >
          <Button color="inherit" onClick={() => router.push(returnPath)}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={saveMutation.isPending}
            startIcon={<RemixIcon icon="solar:diskette-linear" />}
          >
            บันทึก Template
          </Button>
        </Card>
      </Form>
      <TemplateAIDialog
        open={aiDialogOpen}
        onClose={() => setAIDialogOpen(false)}
        templateId={templateId}
        subjects={optionsQuery.data?.subjects ?? []}
        indicators={optionsQuery.data?.indicators ?? []}
        initial={aiDialogInitial}
        onApply={(result, generatedType, generatedSubjectId) => {
          const generatedSubject = optionsQuery.data?.subjects.find(
            (subject) => subject.id === generatedSubjectId
          );
          setValue('templateType', generatedType, { shouldDirty: true });
          setValue('name', result.name, { shouldDirty: true });
          setValue('description', result.description, { shouldDirty: true });
          setValue('content', result.content, { shouldDirty: true });
          setValue('tags', result.tags, { shouldDirty: true });
          setValue('metadata', result.metadata, { shouldDirty: true });
          setValue('indicatorIds', result.indicatorIds, { shouldDirty: true });
          setValue('subjectId', generatedSubjectId ?? null, { shouldDirty: true });
          setValue('curriculumId', generatedSubject?.curriculum_id ?? null, { shouldDirty: true });
          setValue('unitId', null, { shouldDirty: true });
          setValue('learningOutcomeIds', [], { shouldDirty: true });
          setValue('aiGeneration', result.generation, { shouldDirty: true });
          setAIDialogOpen(false);
          toast.success('นำผลลัพธ์ AI มาใส่ในฟอร์มแล้ว กรุณาตรวจสอบก่อนบันทึก');
        }}
      />
    </Container>
  );
}
