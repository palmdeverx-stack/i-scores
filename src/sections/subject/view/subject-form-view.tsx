'use client';

import type { SubjectType, LearningArea, ActivityType } from '../subject-actions';

import * as z from 'zod';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listCurricula, createCurriculum } from 'src/features/curriculum/curriculum-actions';

import { Upload } from 'src/components/upload';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import { listSubjectMasterItems } from 'src/sections/subject-master/subject-master-actions';
import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import { useAuthContext } from 'src/auth/hooks';

import {
  getSubject,
  createSubject,
  deleteSubject,
  updateSubject,
  uploadSubjectImage,
  removeSubjectImage,
  STUDENT_DEVELOPMENT_ACTIVITY_CODE,
} from '../subject-actions';

// ----------------------------------------------------------------------

const FormSchema = z
  .object({
    curriculumMode: z.enum(['none', 'existing', 'new']),
    curriculumId: z.string(),
    newCurriculumName: z.string().trim().max(300),
    newCurriculumCode: z.string().trim().max(100),
    newCurriculumVersion: z.string().trim().max(200),
    scope: z.enum(['school', 'personal', 'public']),
    code: z.string().trim().max(100),
    name: z.string().trim().min(1, { error: 'กรุณากรอกชื่อวิชาภาษาไทย!' }),
    nameEn: z.string().trim(),
    credits: z.number().min(0, { error: 'หน่วยกิตต้องไม่ต่ำกว่า 0!' }).max(99),
    studyHours: z.number().min(0, { error: 'ชั่วโมงเรียนต้องไม่ต่ำกว่า 0!' }).max(9999),
    description: z.string().trim().max(2000, { error: 'คำอธิบายต้องไม่เกิน 2,000 ตัวอักษร!' }),
    descriptionEn: z
      .string()
      .trim()
      .max(2000, { error: 'คำอธิบายภาษาอังกฤษต้องไม่เกิน 2,000 ตัวอักษร!' }),
    academicYearId: z.string(),
    semesterId: z.string(),
    published: z.boolean(),
    learningArea: z.string(),
    activityType: z.string(),
    subjectType: z.string(),
    educationStage: z.string(),
    gradeLevels: z.array(z.string()),
    learningStandardCode: z.string().trim().max(100),
    learningStandards: z.string().max(20000),
    learningOutcomes: z.string().max(20000),
    learningUnits: z.string().max(20000),
    indicators: z.string().max(20000),
    curriculumIndicators: z.array(
      z.object({
        id: z.string().optional(),
        code: z.string().trim().min(1, { error: 'กรุณากรอกรหัสตัวชี้วัด' }).max(100),
        description: z.string().trim().min(1, { error: 'กรุณากรอกรายละเอียดตัวชี้วัด' }).max(5000),
        learningStandard: z.string().trim().max(5000),
      })
    ),
    learningOutcomesStructured: z.array(
      z.object({
        id: z.string().optional(),
        code: z.string().trim().max(100),
        description: z.string().trim().min(1, 'กรุณากรอกผลลัพธ์การเรียนรู้').max(10000),
      })
    ),
    learningUnitsStructured: z.array(
      z.object({
        id: z.string().optional(),
        code: z.string().trim().max(100),
        name: z.string().trim().min(1, 'กรุณากรอกชื่อหน่วยการเรียนรู้').max(500),
        description: z.string().trim().max(10000),
        estimatedPeriods: z.number().int().min(1).max(200).optional(),
      })
    ),
  })
  .superRefine((value, context) => {
    if (value.curriculumMode === 'existing' && !value.curriculumId) {
      context.addIssue({ code: 'custom', path: ['curriculumId'], message: 'กรุณาเลือกหลักสูตร' });
    }
    if (value.curriculumMode === 'new' && !value.newCurriculumName) {
      context.addIssue({
        code: 'custom',
        path: ['newCurriculumName'],
        message: 'กรุณากรอกชื่อหลักสูตร',
      });
    }
    if (value.scope !== 'school') return;
    if (!value.academicYearId) {
      context.addIssue({
        code: 'custom',
        path: ['academicYearId'],
        message: 'กรุณาเลือกปีการศึกษา!',
      });
    }
    if (!value.semesterId) {
      context.addIssue({ code: 'custom', path: ['semesterId'], message: 'กรุณาเลือกภาคเรียน!' });
    }
  });

type FormValues = z.infer<typeof FormSchema>;

const IMAGE_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EMPTY_VALUES: FormValues = {
  curriculumMode: 'none',
  curriculumId: '',
  newCurriculumName: '',
  newCurriculumCode: '',
  newCurriculumVersion: '',
  scope: 'school',
  code: '',
  name: '',
  nameEn: '',
  credits: 1,
  studyHours: 40,
  description: '',
  descriptionEn: '',
  academicYearId: '',
  semesterId: '',
  published: false,
  learningArea: '',
  activityType: '',
  subjectType: '',
  educationStage: '',
  gradeLevels: [],
  learningStandardCode: '',
  learningStandards: '',
  learningOutcomes: '',
  learningUnits: '',
  indicators: '',
  curriculumIndicators: [],
  learningOutcomesStructured: [],
  learningUnitsStructured: [],
};

type Props = {
  subjectId?: string;
  basePath?: string;
  initialAcademicYearId?: string;
  initialSemesterId?: string;
};

export function SubjectFormView({
  subjectId,
  basePath = paths.admin.subject.root,
  initialAcademicYearId = '',
  initialSemesterId = '',
}: Props = {}) {
  const router = useRouter();
  const { user } = useAuthContext();
  const isEdit = !!subjectId;
  const isPersonalWorkspace = user?.is_personal_workspace === true;
  const queryClient = useQueryClient();
  const [subjectImage, setSubjectImage] = useState<File | string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { handleSubmit, reset, setValue, control } = methods;
  const indicatorFields = useFieldArray({
    control,
    name: 'curriculumIndicators',
    keyName: '_key',
  });
  const outcomeFields = useFieldArray({
    control,
    name: 'learningOutcomesStructured',
    keyName: '_key',
  });
  const unitFields = useFieldArray({ control, name: 'learningUnitsStructured', keyName: '_key' });
  const scope = useWatch({ control, name: 'scope' });
  const academicYearId = useWatch({ control, name: 'academicYearId' });
  const semesterId = useWatch({ control, name: 'semesterId' });
  const learningArea = useWatch({ control, name: 'learningArea' });
  const educationStage = useWatch({ control, name: 'educationStage' });
  const published = useWatch({ control, name: 'published' });
  const curriculumMode = useWatch({ control, name: 'curriculumMode' });

  const subjectQuery = useQuery({
    queryKey: ['subjects', 'detail', subjectId],
    queryFn: () => getSubject(subjectId!),
    enabled: isEdit,
  });
  const editingSubject = subjectQuery.data ?? null;
  const { data: academicYears = [], isLoading: academicYearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  });
  const { data: semesters = [], isLoading: semestersLoading } = useQuery({
    queryKey: ['semesters', academicYearId],
    queryFn: () => listSemesters(academicYearId),
    enabled: !!academicYearId,
  });
  const { data: masterItems = [], error: masterItemsError } = useQuery({
    queryKey: ['subject-master-items', scope],
    queryFn: () => listSubjectMasterItems(scope === 'school' ? 'school' : 'global'),
  });
  const { data: curricula = [] } = useQuery({
    queryKey: ['curricula'],
    queryFn: listCurricula,
  });
  const learningAreas = masterItems.filter(
    (item) =>
      item.category === 'learning_area' &&
      (item.is_active || item.code === editingSubject?.learning_area)
  );
  const subjectTypes = masterItems.filter(
    (item) =>
      item.category === 'subject_type' &&
      (item.is_active || item.code === editingSubject?.subject_type)
  );
  const educationStages = masterItems.filter(
    (item) =>
      item.category === 'education_stage' &&
      (item.is_active || item.code === editingSubject?.education_stage)
  );
  const gradeLevelItems = masterItems.filter(
    (item) =>
      item.category === 'grade_level' &&
      (item.is_active || editingSubject?.grade_levels.includes(item.code))
  );
  const activityTypes = masterItems.filter(
    (item) =>
      item.category === 'activity_type' &&
      (item.is_active || item.code === editingSubject?.activity_type)
  );
  const visibleGradeLevels = gradeLevelItems.filter(
    (item) => !item.parent_code || !educationStage || item.parent_code === educationStage
  );

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const linkedCurriculum =
        data.curriculumMode === 'new'
          ? await createCurriculum({
              name: data.newCurriculumName,
              code: data.newCurriculumCode || undefined,
              version: data.newCurriculumVersion || undefined,
              scope: data.scope,
            })
          : null;
      const params = {
        curriculumId: data.curriculumMode === 'existing' ? data.curriculumId : linkedCurriculum?.id,
        name: data.name.trim(),
        scope: data.scope,
        nameEn: data.nameEn.trim() || undefined,
        code: data.code.trim(),
        credits: data.credits,
        studyHours: data.studyHours,
        description: data.description.trim() || undefined,
        descriptionEn: data.descriptionEn.trim() || undefined,
        academicYearId: data.scope === 'school' ? data.academicYearId : undefined,
        semesterId: data.scope === 'school' ? data.semesterId : undefined,
        status: (data.published ? 'published' : 'draft') as 'published' | 'draft',
        learningArea: (data.learningArea || undefined) as LearningArea | undefined,
        activityType: (data.activityType || undefined) as ActivityType | undefined,
        subjectType: (data.subjectType || undefined) as SubjectType | undefined,
        educationStage: data.educationStage || undefined,
        gradeLevels: data.gradeLevels,
        learningStandardCode: data.learningStandardCode.trim() || undefined,
        learningStandards: data.learningStandards.trim() || undefined,
        learningOutcomes: data.learningOutcomes.trim() || undefined,
        learningUnits: data.learningUnits.trim() || undefined,
        indicators: data.indicators.trim() || undefined,
        curriculumIndicators: data.curriculumIndicators,
        learningOutcomesStructured: data.learningOutcomesStructured,
        learningUnitsStructured: data.learningUnitsStructured,
      };
      const subject = editingSubject
        ? await updateSubject(editingSubject.id, params)
        : await createSubject(params);

      try {
        if (subjectImage instanceof File) {
          return await uploadSubjectImage(subject.id, subjectImage);
        }
        if (editingSubject && imageRemoved && editingSubject.image_url) {
          return await removeSubjectImage(subject.id);
        }
        return subject;
      } catch (error) {
        if (!editingSubject) await deleteSubject(subject.id);
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      router.push(basePath);
    },
  });

  useEffect(() => {
    if (isEdit && !editingSubject) return;

    saveMutation.reset();
    setImageRemoved(false);
    setSubjectImage(editingSubject?.image_url ?? null);
    reset(
      editingSubject
        ? {
            curriculumMode: editingSubject.curriculum_id ? 'existing' : 'none',
            curriculumId: editingSubject.curriculum_id ?? '',
            newCurriculumName: '',
            newCurriculumCode: '',
            newCurriculumVersion: '',
            scope: editingSubject.scope === 'system' ? 'personal' : editingSubject.scope,
            code: editingSubject.code ?? '',
            name: editingSubject.name,
            nameEn: editingSubject.name_en ?? '',
            credits: Number(editingSubject.credits),
            studyHours: Number(editingSubject.study_hours ?? 0),
            description: editingSubject.description ?? '',
            descriptionEn: editingSubject.description_en ?? '',
            academicYearId: editingSubject.academic_year_id ?? '',
            semesterId: editingSubject.semester_id ?? '',
            published: editingSubject.status === 'published',
            learningArea: editingSubject.learning_area ?? '',
            activityType: editingSubject.activity_type ?? '',
            subjectType: editingSubject.subject_type ?? '',
            educationStage: editingSubject.education_stage ?? '',
            gradeLevels: editingSubject.grade_levels ?? [],
            learningStandardCode: editingSubject.learning_standard_code ?? '',
            learningStandards: editingSubject.learning_standards ?? '',
            learningOutcomes: editingSubject.learning_outcomes ?? '',
            learningUnits: editingSubject.learning_units ?? '',
            indicators: editingSubject.indicators ?? '',
            curriculumIndicators: editingSubject.curriculum_indicators.map((indicator) => ({
              id: indicator.id,
              code: indicator.code,
              description: indicator.description,
              learningStandard: indicator.learning_standard ?? '',
            })),
            learningOutcomesStructured: editingSubject.learning_outcomes_structured.map((item) => ({
              id: item.id,
              code: item.code ?? '',
              description: item.description,
            })),
            learningUnitsStructured: editingSubject.learning_units_structured.map((item) => ({
              id: item.id,
              code: item.code ?? '',
              name: item.name,
              description: item.description ?? '',
              estimatedPeriods: item.estimated_periods ?? undefined,
            })),
          }
        : {
            ...EMPTY_VALUES,
            scope: isPersonalWorkspace ? 'personal' : 'school',
            academicYearId: initialAcademicYearId,
            semesterId: initialSemesterId,
          }
    );
    // Mutation methods are stable; including the mutation object causes unnecessary resets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editingSubject,
    initialAcademicYearId,
    initialSemesterId,
    isEdit,
    isPersonalWorkspace,
    reset,
  ]);

  useEffect(() => {
    if (!isEdit && isPersonalWorkspace && !academicYearId && academicYears.length === 1) {
      setValue('academicYearId', academicYears[0].id);
    }
  }, [academicYearId, academicYears, isEdit, isPersonalWorkspace, setValue]);

  useEffect(() => {
    if (!isEdit && isPersonalWorkspace && academicYearId && !semesterId && semesters.length === 1) {
      setValue('semesterId', semesters[0].id);
    }
  }, [academicYearId, isEdit, isPersonalWorkspace, semesterId, semesters, setValue]);

  const onSubmit = handleSubmit((data) => saveMutation.mutate(data));

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Button
        component={RouterLink}
        href={basePath}
        color="inherit"
        size="small"
        startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
        sx={{ mb: 1.5, color: 'text.secondary' }}
      >
        กลับหน้ารายวิชา
      </Button>

      <Typography component="h1" variant="h3">
        {isEdit ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชา'}
      </Typography>
      <Typography sx={{ mt: 1, mb: 4, color: 'text.secondary' }}>
        {isEdit
          ? 'ปรับข้อมูลหลักสูตร หน่วยกิต คำอธิบาย และรูปภาพรายวิชา'
          : isPersonalWorkspace
            ? 'เพิ่มรายละเอียดวิชาใหม่เข้าสู่พื้นที่ส่วนตัวของคุณ'
            : 'เพิ่มรายละเอียดวิชาใหม่เข้าสู่รายการของโรงเรียน'}
      </Typography>

      {subjectQuery.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {subjectQuery.error.message}
        </Alert>
      )}
      {subjectQuery.isLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          กำลังโหลดข้อมูลรายวิชา...
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          {saveMutation.error && <Alert severity="error">{saveMutation.error.message}</Alert>}

          <Box
            sx={{
              gap: 3,
              display: 'grid',
              alignItems: 'start',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
            }}
          >
            <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Box sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
                <FormSectionTitle
                  number="1"
                  title="ข้อมูลพื้นฐานรายวิชา"
                  description="กำหนดขอบเขต รหัส และชื่อรายวิชาในหน้าเดียว"
                  icon="solar:notebook-bold-duotone"
                />

                <Field.Select
                  name="scope"
                  label="ขอบเขตรายวิชา"
                  disabled={isEdit}
                  // helperText="เลือกว่ารายวิชานี้ใช้กับโรงเรียน ใช้ส่วนตัว หรือเผยแพร่ให้ทุกคน"
                  onChange={(event) => {
                    const nextScope = event.target.value as FormValues['scope'];
                    setValue('scope', nextScope, { shouldValidate: true });
                    if (nextScope !== 'school') {
                      setValue('academicYearId', '');
                      setValue('semesterId', '');
                    }
                  }}
                >
                  <MenuItem value="school">รายวิชาของโรงเรียน</MenuItem>
                  <MenuItem value="personal">รายวิชาส่วนตัว</MenuItem>
                  <MenuItem value="public">รายวิชาสาธารณะ</MenuItem>
                </Field.Select>

                <Alert severity={scope === 'public' ? 'warning' : 'info'} variant="outlined">
                  {scope === 'school'
                    ? 'รายวิชานี้ใช้กับชั้นเรียนและภาคเรียนของโรงเรียน'
                    : scope === 'public'
                      ? 'เมื่อเผยแพร่ ผู้ใช้ทุกโรงเรียนและผู้ใช้พื้นที่ส่วนตัวจะนำรายวิชาและตัวชี้วัดนี้ไปใช้ได้'
                      : 'รายวิชานี้เป็นของคุณ ไม่ผูกกับโรงเรียน ปีการศึกษา หรือภาคเรียน'}
                </Alert>

                {scope === 'school' ? (
                  <Box
                    sx={{
                      gap: 2,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    }}
                  >
                    <Field.Select
                      name="academicYearId"
                      label="ปีการศึกษา *"
                      disabled={academicYearsLoading}
                      onChange={(event) => {
                        setValue('academicYearId', event.target.value);
                        setValue('semesterId', '', { shouldValidate: true });
                      }}
                      // helperText="ปีที่เปิดรายวิชานี้"
                    >
                      {academicYears.map((year) => (
                        <MenuItem key={year.id} value={year.id}>
                          {year.year}
                        </MenuItem>
                      ))}
                    </Field.Select>
                    <Field.Select
                      name="semesterId"
                      label="ภาคเรียน *"
                      disabled={!academicYearId || semestersLoading}
                      // helperText={academicYearId ? 'ภาคเรียนที่เปิดรายวิชา' : 'เลือกปีการศึกษาก่อน'}
                    >
                      {semesters.map((semester) => (
                        <MenuItem key={semester.id} value={semester.id}>
                          {semester.name}
                        </MenuItem>
                      ))}
                    </Field.Select>
                  </Box>
                ) : null}
                <Box>
                  <Field.Text
                    name="code"
                    label="รหัสวิชา"
                    placeholder="เช่น MATH101"
                    // helperText="ไม่บังคับ หากระบุต้องไม่ซ้ำในภาคเรียนเดียวกัน"
                    autoFocus
                  />
                </Box>
                <Box
                  sx={{
                    gap: 2,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Field.Text
                    name="name"
                    label="ชื่อวิชาภาษาไทย"
                    placeholder="เช่น คณิตศาสตร์พื้นฐาน"
                    // helperText="ชื่อหลักที่ครูและนักเรียนจะเห็นในระบบ"
                    required
                  />
                  <Field.Text
                    name="nameEn"
                    label="ชื่อวิชาภาษาอังกฤษ"
                    placeholder="e.g. Fundamental Mathematics"
                    // helperText="ไม่บังคับ"
                    slotProps={{ htmlInput: { lang: 'en' } }}
                  />
                </Box>

                <Divider />
                <FormSectionTitle
                  number="2"
                  title="หลักสูตรและกลุ่มผู้เรียน"
                  description="เลือกหลักสูตรก่อน แล้วระบบจะแสดงหมวดและระดับชั้นจาก Master"
                  icon="solar:folder-with-files-bold-duotone"
                />
                <Field.Select
                  name="curriculumMode"
                  label="การเชื่อมหลักสูตร"
                  onChange={(event) => {
                    const mode = event.target.value as FormValues['curriculumMode'];
                    setValue('curriculumMode', mode, { shouldValidate: true });
                    if (mode !== 'existing') setValue('curriculumId', '');
                  }}
                >
                  <MenuItem value="none">รายวิชาอิสระ — ไม่ผูกหลักสูตร</MenuItem>
                  <MenuItem value="existing">เลือกหลักสูตรที่มีอยู่</MenuItem>
                  <MenuItem value="new">สร้างหลักสูตรใหม่และเชื่อมทันที</MenuItem>
                </Field.Select>
                {curriculumMode === 'existing' ? (
                  <Field.Select
                    required
                    name="curriculumId"
                    label="หลักสูตร"
                    // helperText="เลือกครั้งเดียว ระบบจะส่งต่อไปยัง Template และแผนการสอน"
                  >
                    {curricula.map((curriculum) => (
                      <MenuItem key={curriculum.id} value={curriculum.id}>
                        {curriculum.code ? `${curriculum.code} · ` : ''}
                        {curriculum.name}
                        {curriculum.version ? ` · ${curriculum.version}` : ''}
                      </MenuItem>
                    ))}
                  </Field.Select>
                ) : null}
                {curriculumMode === 'new' ? (
                  <Card variant="outlined" sx={{ p: 2, display: 'grid', gap: 2 }}>
                    <Alert severity="info">
                      หลักสูตรจะถูกสร้างเป็นข้อมูล reusable และเลือกใช้กับรายวิชาอื่นได้ภายหลัง
                    </Alert>
                    <Field.Text required name="newCurriculumName" label="ชื่อหลักสูตร" />
                    <Box
                      sx={{
                        gap: 2,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      }}
                    >
                      <Field.Text name="newCurriculumCode" label="รหัสหลักสูตร" />
                      <Field.Text name="newCurriculumVersion" label="รุ่น/ปีหลักสูตร" />
                    </Box>
                  </Card>
                ) : null}
                {/* <Typography variant="subtitle2">การจัดหมวดหมู่จาก Master</Typography> */}
                {masterItemsError ? (
                  <Alert severity="error">
                    ไม่สามารถโหลดข้อมูล Master ได้: {masterItemsError.message}
                  </Alert>
                ) : null}
                {!masterItemsError && masterItems.length === 0 ? (
                  <Alert severity="warning">
                    ยังไม่มีข้อมูล Master สำหรับขอบเขตรายวิชานี้ กรุณาติดต่อผู้ดูแลระบบ
                  </Alert>
                ) : null}
                <Box
                  sx={{
                    gap: 2,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Field.Select
                    name="learningArea"
                    label="กลุ่มสาระการเรียนรู้"
                    // helperText="ดึงจาก Master กลุ่มสาระ"
                    sx={{ gridColumn: { sm: 'span 2' } }}
                    onChange={(event) => {
                      setValue('learningArea', event.target.value);
                      if (event.target.value !== STUDENT_DEVELOPMENT_ACTIVITY_CODE) {
                        setValue('activityType', '');
                      }
                    }}
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {learningAreas.map((area) => (
                      <MenuItem key={area.id} value={area.code}>
                        {area.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                  <Field.Select
                    name="subjectType"
                    label="ประเภทรายวิชา"
                    // helperText="ดึงจาก Master ประเภทรายวิชา"
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {subjectTypes.map((type) => (
                      <MenuItem key={type.id} value={type.code}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                  <Field.Select
                    name="educationStage"
                    label="ช่วงชั้น"
                    // helperText="เลือกเพื่อกรองระดับชั้นที่สัมพันธ์กัน"
                    onChange={(event) => {
                      const nextStage = event.target.value;
                      setValue('educationStage', nextStage);
                      const allowedCodes = new Set(
                        gradeLevelItems
                          .filter(
                            (item) =>
                              !item.parent_code || !nextStage || item.parent_code === nextStage
                          )
                          .map((item) => item.code)
                      );
                      setValue(
                        'gradeLevels',
                        methods.getValues('gradeLevels').filter((level) => allowedCodes.has(level)),
                        { shouldValidate: true }
                      );
                    }}
                  >
                    <MenuItem value="">ไม่ระบุ</MenuItem>
                    {educationStages.map((stage) => (
                      <MenuItem key={stage.id} value={stage.code}>
                        {stage.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                  {learningArea === STUDENT_DEVELOPMENT_ACTIVITY_CODE && (
                    <Field.Select
                      name="activityType"
                      label="ประเภทกิจกรรมพัฒนาผู้เรียน"
                      // helperText="แนะแนว ลูกเสือ/นศท. ชุมนุม หรือจิตอาสา"
                      sx={{ gridColumn: { sm: 'span 2' } }}
                    >
                      <MenuItem value="">ไม่ระบุ</MenuItem>
                      {activityTypes.map((type) => (
                        <MenuItem key={type.id} value={type.code}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Field.Select>
                  )}
                  <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                    <Field.Autocomplete
                      name="gradeLevels"
                      label="ระดับชั้นที่เปิดสอน"
                      placeholder="ไม่ระบุ"
                      fullWidth
                      multiple
                      keyOption={{ label: 'label', value: 'value' }}
                      options={visibleGradeLevels.map((level) => ({
                        label: level.name,
                        value: level.code,
                      }))}
                      // helperText={
                      //   educationStage
                      //     ? 'แสดงเฉพาะระดับชั้นในช่วงที่เลือก'
                      //     : 'เลือกช่วงชั้นก่อนเพื่อกรองรายการ'
                      // }
                    />
                  </Box>
                </Box>

                <Divider />
                <FormSectionTitle
                  number="3"
                  title="เวลาเรียนและคำอธิบาย"
                  description="กำหนดหน่วยกิต ชั่วโมงเรียน และรายละเอียดรายวิชา"
                  icon="solar:clock-circle-bold-duotone"
                />

                <Box
                  sx={{
                    gap: 2,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  }}
                >
                  <Field.Text
                    name="credits"
                    label="หน่วยกิต *"
                    type="number"
                    placeholder="เช่น 0.5, 1 หรือ 3"
                    // helperText="เช่น 0.5, 1 หรือ 3"
                    slotProps={{ htmlInput: { min: 0, max: 99, step: 0.5 } }}
                  />
                  <Field.Text
                    name="studyHours"
                    label="ชั่วโมงเรียน *"
                    type="number"
                    // helperText="จำนวนชั่วโมงเรียนรวมของรายวิชา"
                    slotProps={{ htmlInput: { min: 0, max: 9999, step: 0.5 } }}
                  />
                </Box>
                <Field.Text
                  name="description"
                  label="คำอธิบายรายวิชา"
                  placeholder="สรุปเนื้อหาและวัตถุประสงค์ของรายวิชา"
                  // helperText="ไม่บังคับ สูงสุด 2,000 ตัวอักษร"
                  multiline
                  minRows={3}
                />
                <Field.Text
                  name="descriptionEn"
                  label="คำอธิบายรายวิชาภาษาอังกฤษ"
                  placeholder="Course scope, objectives, or additional details"
                  // helperText="ไม่บังคับ สูงสุด 2,000 ตัวอักษร"
                  multiline
                  minRows={3}
                  slotProps={{ htmlInput: { lang: 'en' } }}
                />

                <Divider />
                <FormSectionTitle
                  number="4"
                  title="โครงสร้างรายวิชา"
                  description="ข้อมูลที่สร้างเฉพาะรายวิชาและนำไปเลือกใช้ซ้ำในแผนการสอน"
                  icon="solar:document-text-bold-duotone"
                />
                <Stack spacing={0.75}>
                  <Typography variant="h6">มาตรฐานการเรียนรู้</Typography>
                  <Field.Text
                    name="learningStandardCode"
                    label="รหัสมาตรฐานการเรียนรู้"
                    placeholder="เช่น ท 1.1"
                    // helperText="ไม่บังคับ สูงสุด 100 ตัวอักษร"
                  />
                  <Field.Editor
                    name="learningStandards"
                    placeholder="รายละเอียดมาตรฐาน เช่น ใช้กระบวนการอ่านสร้างความรู้และความคิด"
                  />
                  {/* <Typography variant="caption" color="text.secondary">
                    กรอกที่นี่ครั้งเดียว ตัวชี้วัดและแผนการสอนจะอ้างอิงมาตรฐานชุดนี้
                  </Typography> */}
                </Stack>
                <Box>
                  <Box
                    sx={{
                      mb: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6">ผลลัพธ์การเรียนรู้รายวิชา</Typography>
                      <Typography variant="body2" color="text.secondary">
                        เป็นข้อมูลอ้างอิงของรายวิชา ไม่ใช่จุดประสงค์เฉพาะแผน
                      </Typography>
                    </Box>
                    <Button
                      startIcon={<RemixIcon icon="mingcute:add-line" />}
                      onClick={() => outcomeFields.append({ code: '', description: '' })}
                    >
                      เพิ่มผลลัพธ์
                    </Button>
                  </Box>
                  {!outcomeFields.fields.length ? (
                    <Alert severity="info" variant="outlined">
                      ไม่บังคับ สามารถเพิ่มภายหลังได้
                    </Alert>
                  ) : null}
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    {outcomeFields.fields.map((item, index) => (
                      <Card key={item._key} variant="outlined" sx={{ p: 2 }}>
                        <Box
                          sx={{
                            gap: 1.5,
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr) auto' },
                          }}
                        >
                          <Field.Text
                            name={`learningOutcomesStructured.${index}.code`}
                            label="รหัส (ถ้ามี)"
                          />
                          <Field.Text
                            required
                            name={`learningOutcomesStructured.${index}.description`}
                            label="ผลลัพธ์การเรียนรู้"
                          />
                          <Button color="error" onClick={() => outcomeFields.remove(index)}>
                            ลบ
                          </Button>
                        </Box>
                      </Card>
                    ))}
                  </Stack>
                </Box>
                <Box>
                  <Box
                    sx={{
                      mb: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6">หน่วยการเรียนรู้</Typography>
                      <Typography variant="body2" color="text.secondary">
                        สร้างครั้งเดียวแล้วเลือกใช้เมื่อเขียนแผน
                      </Typography>
                    </Box>
                    <Button
                      startIcon={<RemixIcon icon="mingcute:add-line" />}
                      onClick={() =>
                        unitFields.append({
                          code: '',
                          name: '',
                          description: '',
                          estimatedPeriods: undefined,
                        })
                      }
                    >
                      เพิ่มหน่วย
                    </Button>
                  </Box>
                  {!unitFields.fields.length ? (
                    <Alert severity="info" variant="outlined">
                      ไม่บังคับ ผู้สอนยังตั้งชื่อหน่วยเองในแผนได้
                    </Alert>
                  ) : null}
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    {unitFields.fields.map((item, index) => (
                      <Card
                        key={item._key}
                        variant="outlined"
                        sx={{ p: 2, display: 'grid', gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            gap: 1.5,
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: '1fr',
                              sm: '160px minmax(0, 1fr) 150px auto',
                            },
                          }}
                        >
                          <Field.Text
                            name={`learningUnitsStructured.${index}.code`}
                            label="รหัสหน่วย"
                          />
                          <Field.Text
                            required
                            name={`learningUnitsStructured.${index}.name`}
                            label="ชื่อหน่วย"
                          />
                          <Field.Text
                            type="number"
                            name={`learningUnitsStructured.${index}.estimatedPeriods`}
                            label="จำนวนคาบ"
                          />
                          <Button color="error" onClick={() => unitFields.remove(index)}>
                            ลบ
                          </Button>
                        </Box>
                        <Field.Text
                          multiline
                          minRows={2}
                          name={`learningUnitsStructured.${index}.description`}
                          label="ขอบเขตเนื้อหาของหน่วย"
                        />
                      </Card>
                    ))}
                  </Stack>
                </Box>
                <Box>
                  <Box
                    sx={{
                      gap: 2,
                      mb: 2,
                      display: 'flex',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      justifyContent: 'space-between',
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <Box>
                      <Typography variant="h6">ตัวชี้วัด</Typography>
                      <Typography variant="body2" color="text.secondary">
                        กำหนดรหัสและข้อความจริงที่ AI สามารถใช้อ้างอิงได้
                      </Typography>
                    </Box>
                    <Button
                      startIcon={<RemixIcon icon="mingcute:add-line" />}
                      onClick={() =>
                        indicatorFields.append({
                          code: '',
                          description: '',
                          learningStandard: '',
                        })
                      }
                    >
                      เพิ่มตัวชี้วัด
                    </Button>
                  </Box>

                  {!indicatorFields.fields.length ? (
                    <Alert severity="info" variant="outlined">
                      ยังไม่มีตัวชี้วัด สามารถบันทึกรายวิชาไว้ก่อนแล้วเพิ่มภายหลังได้
                    </Alert>
                  ) : null}

                  <Stack spacing={2}>
                    {indicatorFields.fields.map((indicator, index) => (
                      <Card key={indicator._key} variant="outlined" sx={{ p: 2 }}>
                        <Box
                          sx={{
                            gap: 1.5,
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: '1fr',
                              sm: 'minmax(180px, 0.35fr) minmax(0, 1fr) auto',
                            },
                          }}
                        >
                          <Field.Text
                            required
                            name={`curriculumIndicators.${index}.code`}
                            label="รหัสตัวชี้วัด"
                            placeholder="เช่น ท 1.1 ป.1/1"
                          />
                          <Field.Text
                            required
                            name={`curriculumIndicators.${index}.description`}
                            label="รายละเอียดตัวชี้วัด"
                            placeholder="ข้อความตัวชี้วัดตามหลักสูตร"
                          />
                          <Button color="error" onClick={() => indicatorFields.remove(index)}>
                            ลบ
                          </Button>
                        </Box>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </Card>

            <Card
              variant="outlined"
              sx={{
                p: 3,
                top: 88,
                position: { lg: 'sticky' },
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">สถานะการเผยแพร่</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {scope === 'public'
                    ? 'เปิดเผยแพร่เพื่อให้ผู้ใช้ทุกคนมองเห็นและนำไปใช้ได้'
                    : scope === 'school'
                      ? 'ครูและผู้บริหารในโรงเรียนจะเห็นเมื่อเผยแพร่แล้ว'
                      : 'แบบร่างและรายวิชาที่เผยแพร่ยังคงมองเห็นเฉพาะคุณ'}
                </Typography>
              </Box>
              <Field.Switch
                name="published"
                label={published ? 'เผยแพร่แล้ว' : 'แบบร่าง'}
                sx={{ mb: 2.5 }}
              />
              <Divider sx={{ mb: 2.5 }} />
              <Box sx={{ gap: 1.25, mb: 2.5, display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    display: 'grid',
                    flexShrink: 0,
                    borderRadius: 1.5,
                    color: 'primary.main',
                    placeItems: 'center',
                    bgcolor: 'primary.lighter',
                  }}
                >
                  <RemixIcon icon="solar:gallery-wide-bold-duotone" width={23} />
                </Box>
                <Box>
                  <Typography variant="subtitle1">รูปภาพรายวิชา</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    รูปหน้าปกรายวิชา
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.25, mb: 1.5, color: 'text.secondary' }}>
                รูปนี้จะแสดงในหน้ารายวิชาของครูและนักเรียน
              </Typography>
              <Upload
                value={subjectImage}
                accept={IMAGE_ACCEPT}
                maxSize={MAX_IMAGE_SIZE}
                disabled={saveMutation.isPending}
                onDrop={(files) => {
                  const file = files[0];
                  if (file) {
                    setSubjectImage(file);
                    setImageRemoved(false);
                  }
                }}
                onDelete={() => {
                  setSubjectImage(null);
                  setImageRemoved(true);
                }}
                helperText="PNG, JPEG หรือ WEBP ขนาดไม่เกิน 5MB แนะนำอัตราส่วน 16:9"
                sx={{ height: { xs: 180, sm: 220 } }}
              />
              <Alert severity="info" variant="outlined" sx={{ mt: 2.5 }}>
                ช่องที่มีเครื่องหมาย * เป็นข้อมูลที่จำเป็น
              </Alert>
            </Card>
          </Box>

          <Card
            variant="outlined"
            sx={{
              p: 2,
              bottom: 16,
              zIndex: 5,
              position: 'sticky',
              boxShadow: (theme) => theme.vars.customShadows.z8,
            }}
          >
            <Box
              sx={{
                gap: 1,
                display: 'flex',
                alignItems: { sm: 'center' },
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary' }}
              >
                ตรวจสอบข้อมูลให้ครบก่อนบันทึกรายวิชา
              </Typography>
              <Box sx={{ gap: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  component={RouterLink}
                  href={basePath}
                  color="inherit"
                  size="large"
                  disabled={saveMutation.isPending}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  size="large"
                  variant="contained"
                  loading={saveMutation.isPending}
                  disabled={subjectQuery.isLoading || subjectQuery.isError}
                  sx={{ minWidth: 170 }}
                >
                  {isEdit ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </Form>
    </Container>
  );
}

function FormSectionTitle({
  icon,
  number,
  title,
  description,
}: {
  icon: string;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 42,
          height: 42,
          display: 'grid',
          flexShrink: 0,
          borderRadius: 1.5,
          color: 'primary.main',
          placeItems: 'center',
          bgcolor: 'primary.lighter',
          position: 'relative',
        }}
      >
        <RemixIcon icon={icon} width={23} />
        <Box
          sx={{
            right: -6,
            bottom: -6,
            width: 20,
            height: 20,
            display: 'grid',
            borderRadius: '50%',
            color: 'common.white',
            placeItems: 'center',
            bgcolor: 'primary.main',
            fontSize: 11,
            fontWeight: 700,
            position: 'absolute',
            border: '2px solid',
            borderColor: 'background.paper',
          }}
        >
          {number}
        </Box>
      </Box>
      <Box>
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
