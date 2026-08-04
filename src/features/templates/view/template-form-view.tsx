'use client';

import type { TemplateAIAction } from 'src/features/ai/types/ai.types';
import type { TemplateType, TemplateInput, TemplateContent } from '../types';

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

import { TemplateAIDialog } from 'src/features/ai/components/template-ai-dialog';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import { parseTemplateInput } from '../schemas';
import { TemplatePreview } from '../components/template-preview';
import { TemplateContentFields } from '../components/template-content-fields';
import { GRADE_LEVELS, TEMPLATE_TYPES, TEMPLATE_TYPE_LABELS } from '../constants';
import {
  createTemplate,
  updateTemplate,
  getTemplateById,
  getTemplateOptions,
} from '../template-actions';

const LOCAL_DRAFT_KEY = 'lesson-template-create-draft-v1';

const SUBJECT_SCOPE_LABELS = {
  system: 'ระบบ',
  personal: 'ส่วนตัว',
  school: 'โรงเรียน',
  public: 'สาธารณะ',
} as const;

function uid() {
  return crypto.randomUUID();
}

export function defaultTemplateContent(type: TemplateType): TemplateContent {
  if (type === 'learning_objective')
    return {
      description: '',
      domain: 'knowledge',
      behaviorVerb: '',
      condition: '',
      expectedResult: '',
      successCriteria: '',
    };
  if (type === 'essential_content') return { content: '', keyConcepts: [] };
  if (type === 'learning_content')
    return { topics: [{ id: uid(), title: '', description: '', order: 0 }] };
  if (type === 'learning_activity')
    return {
      activityName: '',
      teachingMethod: '',
      phase: 'learning',
      durationMinutes: 50,
      objectives: [],
      teacherActions: [],
      studentActions: [],
      requiredMaterials: [],
      expectedOutputs: [],
      groupType: 'whole_class',
    };
  if (type === 'assessment')
    return {
      assessmentType: 'observation',
      method: '',
      instrument: '',
      evidence: '',
      criteria: '',
      passingScore: 0,
      maximumScore: 10,
    };
  if (type === 'rubric')
    return {
      rubricType: 'analytic',
      scoreType: 'score',
      maximumScore: 4,
      passingScore: 2,
      criteria: [
        {
          id: uid(),
          name: '',
          description: '',
          weight: 100,
          levels: [{ id: uid(), level: 1, label: 'ผ่าน', score: 1, description: '' }],
        },
      ],
    };
  if (type === 'media')
    return {
      mediaType: 'worksheet',
      title: '',
      description: '',
      url: '',
      marketplaceProductId: '',
      usageInstructions: '',
    };
  if (type === 'question')
    return {
      questions: [
        {
          id: uid(),
          question: '',
          bloomLevel: 'understand',
          expectedAnswer: '',
          followUpQuestions: [],
        },
      ],
    };
  if (type === 'reflection')
    return {
      sections: [{ id: uid(), title: 'ผลการจัดการเรียนรู้', placeholder: '', required: true }],
    };
  return {
    sections: [
      {
        id: uid(),
        sectionType: 'learning_objective',
        title: 'จุดประสงค์การเรียนรู้',
        order: 0,
        required: true,
      },
    ],
  };
}

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

export function TemplateFormView({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initializedId = useRef<string | null>(null);
  const methods = useForm<TemplateInput>({ defaultValues: createDefaults() });
  const [aiDialogOpen, setAIDialogOpen] = useState(false);
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

  useEffect(() => {
    if (templateId || initializedId.current) return;
    initializedId.current = 'new';
    const saved = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!saved) return;
    try {
      reset(parseTemplateInput(JSON.parse(saved)) as TemplateInput);
      toast.info('กู้คืนฉบับร่างที่บันทึกอัตโนมัติแล้ว');
    } catch {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    }
  }, [reset, templateId]);

  useEffect(() => {
    const template = templateQuery.data;
    if (!template || initializedId.current === template.id) return;
    initializedId.current = template.id;
    reset({
      name: template.name,
      description: template.description ?? '',
      templateType: template.template_type,
      scope: template.scope === 'school' ? 'school' : 'personal',
      status: template.status,
      content: template.content,
      metadata: template.metadata,
      tags: template.tags,
      subjectId: template.subject_id,
      curriculumId: template.curriculum_id,
      unitId: template.unit_id,
      courseId: template.course_id,
      gradeLevels: template.grade_levels,
      indicatorIds: template.indicator_ids,
      learningOutcomeIds: template.learning_outcome_ids,
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
    if (templateId || !isDirty) return undefined;
    const timer = window.setTimeout(
      () => localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(methods.getValues())),
      800
    );
    return () => window.clearTimeout(timer);
  }, [isDirty, methods, templateId, content, templateType]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: (input: TemplateInput) =>
      templateId ? updateTemplate(templateId, input) : createTemplate(input),
    onSuccess: async (saved) => {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
      toast.success(templateId ? 'บันทึกการแก้ไขแล้ว' : 'สร้าง Template แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['lesson-templates'] });
      router.push(paths.teacher.lessonPlans.templates);
      router.refresh();
      reset({ ...methods.getValues(), name: saved.name });
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = handleSubmit((values) => {
    try {
      saveMutation.mutate(parseTemplateInput(values) as TemplateInput);
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
            {templateId ? 'แก้ไข Template' : 'สร้าง Template'}
          </Typography>
          <Typography color="text.secondary">
            สร้างองค์ประกอบที่นำกลับมาใช้ซ้ำในแผนการสอนได้
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
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(320px, 0.6fr)' },
          }}
        >
          <Box sx={{ gap: 3, display: 'grid' }}>
            <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, gap: 2, display: 'grid' }}>
              <Typography variant="h5">ข้อมูลทั่วไป</Typography>
              <Field.Text required name="name" label="ชื่อ Template" />
              <Box
                sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
              >
                <Field.Select
                  required
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
                <Field.Select
                  name="subjectId"
                  label="รายวิชา"
                  onChange={(event) => {
                    const nextSubjectId = event.target.value || null;
                    const nextSubject = optionsQuery.data?.subjects.find(
                      (subject) => subject.id === nextSubjectId
                    );
                    setValue('subjectId', nextSubjectId, { shouldDirty: true });
                    setValue('curriculumId', nextSubject?.curriculum_id ?? null, { shouldDirty: true });
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
                        {unit.code ? `${unit.code} · ` : ''}{unit.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                ) : null}
                <TextField
                  disabled
                  label="กลุ่มสาระ"
                  value={selectedSubject?.learning_area || 'เลือกจากรายวิชา'}
                />
              </Box>
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
                      getOptionLabel={(option) => `${option.code ? `${option.code} · ` : ''}${option.description}`}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      onChange={(_, value) => field.onChange(value.map((item) => item.id))}
                      renderInput={(params) => <TextField {...params} label="ผลลัพธ์การเรียนรู้ที่เกี่ยวข้อง" />}
                    />
                  )}
                />
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
            <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, gap: 2, display: 'grid' }}>
              <Box>
                <Typography variant="h5">เนื้อหา: {TEMPLATE_TYPE_LABELS[templateType]}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ฟอร์มจะเปลี่ยนตามประเภท Template
                </Typography>
              </Box>
              <Divider />
              <TemplateContentFields templateType={templateType} />
            </Card>
          </Box>
          <Card
            variant="outlined"
            sx={{ p: { xs: 2, sm: 3 }, position: { lg: 'sticky' }, top: { lg: 88 } }}
          >
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="h5">Preview</Typography>
              {aiGeneration?.isAIGenerated ? <Chip color="secondary" size="small" label="สร้างด้วย AI" /> : null}
            </Box>
            <TemplatePreview
              templateType={templateType}
              content={content as Record<string, unknown>}
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
          <Button color="inherit" onClick={() => router.push(paths.teacher.lessonPlans.templates)}>
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
