'use client';

import type { Control } from 'react-hook-form';
import type { DropResult } from '@hello-pangea/dnd';
import type { LessonPlan, LessonPlanInput } from '../lesson-plan-actions';

import * as z from 'zod';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch, Controller, useFieldArray } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { curriculumReferenceShape } from 'src/features/curriculum/schema';
import { LessonPlanTemplatePickerDialog } from 'src/features/templates/components/lesson-plan-template-picker-dialog';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import {
  parseAssessment,
  parseIndicators,
  serializeAssessment,
  serializeIndicators,
  richTextToPlainText,
} from '../lesson-plan-content';
import {
  getLessonPlan,
  createLessonPlan,
  updateLessonPlan,
  listLessonPlanOptions,
  listLessonPlanTemplates,
} from '../lesson-plan-actions';

// ----------------------------------------------------------------------

const LessonPlanPdfDialog = dynamic(() => import('../components/lesson-plan-pdf-dialog'), {
  ssr: false,
});

// ----------------------------------------------------------------------

const optionalDate = z
  .string()
  .nullable()
  .refine((value) => !value || dayjs(value).isValid(), { error: 'วันที่ไม่ถูกต้อง' });

const requiredRichText = (message: string, max: number) =>
  z
    .string()
    .max(max, { error: 'ข้อมูลยาวเกินกำหนด' })
    .refine((value) => Boolean(richTextToPlainText(value)), { error: message });

const indicatorsSchema = z
  .array(
    z.object({
      code: z.string().trim().min(1, { error: 'กรุณากรอกรหัสตัวชี้วัด' }),
      description: z.string().trim().min(1, { error: 'กรุณากรอกรายละเอียดตัวชี้วัด' }),
    })
  )
  .min(1, { error: 'กรุณาเพิ่มตัวชี้วัดอย่างน้อย 1 รายการ' })
  .refine((rows) => serializeIndicators(rows).length <= 20000, {
    error: 'ข้อมูลยาวเกินกำหนด',
  });

const LessonPlanSchema = z
  .object({
    ...curriculumReferenceShape,
    teacherAssignmentId: z.string().uuid({ error: 'กรุณาเลือกรายวิชาและห้องเรียน' }),
    title: z
      .string()
      .trim()
      .min(1, { error: 'กรุณากรอกชื่อแผนการสอน' })
      .max(200, { error: 'ชื่อแผนการสอนต้องไม่เกิน 200 ตัวอักษร' }),
    unitNumber: z
      .number({ error: 'กรุณาระบุหน่วยที่' })
      .int({ error: 'หน่วยต้องเป็นจำนวนเต็ม' })
      .min(1, { error: 'หน่วยต้องเริ่มจาก 1' }),
    unitName: z
      .string()
      .trim()
      .min(1, { error: 'กรุณากรอกชื่อหน่วยการเรียนรู้' })
      .max(300, { error: 'ชื่อหน่วยต้องไม่เกิน 300 ตัวอักษร' }),
    durationPeriods: z
      .number({ error: 'กรุณาระบุจำนวนคาบ' })
      .int({ error: 'จำนวนคาบต้องเป็นจำนวนเต็ม' })
      .min(1, { error: 'จำนวนคาบต้องอย่างน้อย 1 คาบ' })
      .max(200, { error: 'จำนวนคาบต้องไม่เกิน 200 คาบ' }),
    startDate: optionalDate,
    endDate: optionalDate,
    learningStandards: z
      .array(
        z.object({
          content: z.string().trim().min(1, { error: 'กรุณากรอกมาตรฐานการเรียนรู้' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มมาตรฐานการเรียนรู้อย่างน้อย 1 รายการ' })
      .refine((rows) => rows.map((row) => row.content).join('\n').length <= 20000, {
        error: 'ข้อมูลยาวเกินกำหนด',
      }),
    indicators: indicatorsSchema,
    learningObjectives: z
      .array(
        z.object({
          label: z.string().trim().min(1, { error: 'กรุณาระบุชื่อด้าน' }),
          code: z.string().trim(),
          items: z
            .array(
              z.object({
                content: z.string().trim().min(1, { error: 'กรุณากรอกจุดประสงค์การเรียนรู้' }),
              })
            )
            .min(1, { error: 'กรุณาเพิ่มจุดประสงค์การเรียนรู้อย่างน้อย 1 รายการ' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มด้านของจุดประสงค์การเรียนรู้อย่างน้อย 1 ด้าน' })
      .refine((groups) => serializeObjectiveFormGroups(groups).length <= 20000, {
        error: 'ข้อมูลยาวเกินกำหนด',
      }),
    essentialContent: requiredRichText('กรุณากรอกสาระสำคัญ', 30000),
    learnerCompetencies: requiredRichText('กรุณากรอกสมรรถนะสำคัญของผู้เรียน', 30000),
    desiredCharacteristics: requiredRichText('กรุณากรอกคุณลักษณะอันพึงประสงค์', 30000),
    guidingQuestions: requiredRichText('กรุณากรอกคำถามหลัก', 30000),
    learningActivities: requiredRichText('กรุณากรอกกิจกรรมการเรียนรู้', 50000),
    learningMedia: z
      .array(
        z.object({
          content: z
            .string()
            .trim()
            .min(1, { error: 'กรุณากรอกสื่อหรือแหล่งเรียนรู้' })
            .max(2000, { error: 'รายการยาวเกินกำหนด' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มสื่อหรือแหล่งเรียนรู้อย่างน้อย 1 รายการ' })
      .max(100, { error: 'เพิ่มสื่อได้ไม่เกิน 100 รายการ' }),
    assessment: z
      .array(
        z.object({
          issue: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุประเด็นการประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
          method: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุวิธีการประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
          tool: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุเครื่องมือการประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
          criteria: z
            .string()
            .trim()
            .min(1, { error: 'กรุณาระบุเกณฑ์การประเมิน' })
            .max(10000, { error: 'ข้อมูลยาวเกินกำหนด' }),
        })
      )
      .min(1, { error: 'กรุณาเพิ่มการประเมินอย่างน้อย 1 รายการ' })
      .max(50, { error: 'เพิ่มการประเมินได้ไม่เกิน 50 รายการ' })
      .refine((rows) => serializeAssessment(rows).length <= 30000, {
        error: 'ข้อมูลการประเมินรวมยาวเกินกำหนด',
      }),
  })
  .superRefine((values, context) => {
    if (
      values.startDate &&
      values.endDate &&
      dayjs(values.endDate).startOf('day').isBefore(dayjs(values.startDate).startOf('day'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มใช้',
      });
    }
  });

type LessonPlanFormValues = z.infer<typeof LessonPlanSchema>;

type LearningMediaItem = LessonPlanFormValues['learningMedia'][number];

type SerializedObjectiveGroup = {
  code: string;
  label: string;
  items: string[];
};

const EMPTY_GROUP_LABEL = 'หมวดหมู่ใหม่';
const EMPTY_GROUP_CODE = '-';

const TAB_FORM_FIELDS: Record<string, Array<keyof LessonPlanFormValues>> = {
  'lesson-plan-general': [
    'teacherAssignmentId',
    'title',
    'unitNumber',
    'unitName',
    'durationPeriods',
    'startDate',
    'endDate',
  ],
  'lesson-plan-standards': ['subjectId', 'indicatorIds', 'learningStandards', 'indicators'],
  'lesson-plan-objectives': ['learningObjectives'],
  'lesson-plan-essential': ['essentialContent'],
  'lesson-plan-characteristics': ['desiredCharacteristics'],
  'lesson-plan-competencies': ['learnerCompetencies'],
  'lesson-plan-questions': ['guidingQuestions'],
  'lesson-plan-activities': ['learningActivities'],
  'lesson-plan-media': ['learningMedia'],
  'lesson-plan-assessment': ['assessment'],
};

const DEFAULT_TAB_ORDER = Object.keys(TAB_FORM_FIELDS);
const TAB_ORDER_STORAGE_KEY = 'lesson-plan-tab-order';

const TAB_TEMPLATE_TYPES = {
  'lesson-plan-objectives': 'learning_objective',
  'lesson-plan-essential': 'essential_content',
  'lesson-plan-questions': 'question',
  'lesson-plan-activities': 'learning_activity',
  'lesson-plan-media': 'media',
  'lesson-plan-assessment': 'assessment',
} as const;

type LessonPlanNavigationSection = {
  id: string;
  label: string;
  complete: boolean;
};

function DraggableLessonPlanTab({
  section,
  index,
  active,
  onMove,
  onSelect,
}: {
  section: LessonPlanNavigationSection;
  index: number;
  active: boolean;
  onMove: (tabId: string, offset: number) => void;
  onSelect: (tabId: string) => void;
}) {
  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided, snapshot) => (
        <Button
          ref={provided.innerRef}
          {...provided.draggableProps}
          fullWidth
          color="inherit"
          title="ลากไอคอนเพื่อจัดลำดับ หรือกด Alt พร้อมปุ่มลูกศรขึ้น/ลง"
          aria-label={`${section.label} ${section.complete ? 'ครบแล้ว' : 'ยังไม่ครบ'}`}
          onClick={() => onSelect(section.id)}
          onKeyDown={(event) => {
            if (!event.altKey) return;
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              onMove(section.id, -1);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              onMove(section.id, 1);
            }
          }}
          sx={{
            gap: 1,
            px: 1.25,
            py: 1,
            minWidth: 0,
            borderRadius: 1,
            position: 'relative',
            justifyContent: 'flex-start',
            opacity: snapshot.isDragging ? 0.85 : 1,
            bgcolor: active ? 'primary.lighter' : 'transparent',
            color: active ? 'primary.main' : 'text.secondary',
            ...(snapshot.isDragging && {
              border: 0,
              outline: 'none',
              boxShadow: 'none',
            }),
            '&:hover': {
              bgcolor: snapshot.isDragging
                ? active
                  ? 'primary.lighter'
                  : 'transparent'
                : 'action.hover',
            },
          }}
        >
          <RemixIcon
            width={20}
            icon={section.complete ? 'solar:check-circle-bold' : 'solar:radio-button-linear'}
            sx={{
              flexShrink: 0,
              color: section.complete ? 'success.main' : 'text.disabled',
            }}
          />
          <Typography
            component="span"
            variant="body2"
            sx={{ minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {section.label}
          </Typography>
          <Box
            {...provided.dragHandleProps}
            component="span"
            aria-label={`ลากเพื่อย้าย ${section.label}`}
            sx={{
              ml: 'auto',
              p: 0.25,
              display: 'grid',
              flexShrink: 0,
              cursor: 'grab',
              color: 'text.disabled',
              touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <RemixIcon icon="custom:drag-dots-fill" width={18} />
          </Box>
        </Button>
      )}
    </Draggable>
  );
}

const EMPTY_FORM: LessonPlanFormValues = {
  curriculumId: null,
  subjectId: null,
  unitId: null,
  gradeLevels: [],
  indicatorIds: [],
  learningOutcomeIds: [],
  teacherAssignmentId: '',
  title: '',
  unitNumber: 1,
  unitName: '',
  durationPeriods: 1,
  startDate: null,
  endDate: null,
  learningStandards: [{ content: '' }],
  indicators: [{ code: '', description: '' }],
  learningObjectives: [{ label: '', code: '', items: [{ content: '' }] }],
  essentialContent: '',
  learnerCompetencies: '',
  desiredCharacteristics: '',
  guidingQuestions: '',
  learningActivities: '',
  learningMedia: [{ content: '' }],
  assessment: [],
};

function plainText(value?: string | null) {
  return richTextToPlainText(value);
}

function subjectLearningStandardText(subject: {
  learning_standard_code?: string | null;
  learning_standards?: string | null;
}) {
  return [subject.learning_standard_code?.trim(), plainText(subject.learning_standards)]
    .filter(Boolean)
    .join(' ');
}

function parseLearningMedia(value?: string | null): LearningMediaItem[] {
  const items = plainText(value)
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+(?:\.\d+)*[.)]?|[-•])\s*/, '').trim())
    .filter(Boolean)
    .map((content) => ({ content }));

  return items.length ? items : [{ content: '' }];
}

function serializeLearningMedia(items: LearningMediaItem[]) {
  return items
    .map((item) => item.content.trim())
    .filter(Boolean)
    .map((item, index) => `8.${index + 1} ${item}`)
    .join('\n');
}

function splitItems(value: string) {
  return value ? value.split('\n') : [''];
}

function parseObjectives(value: string): SerializedObjectiveGroup[] {
  const groups: SerializedObjectiveGroup[] = [];
  let currentGroup: SerializedObjectiveGroup | null = null;

  value.split('\n').forEach((line) => {
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

function serializeObjectives(groups: SerializedObjectiveGroup[]) {
  return groups
    .flatMap(({ code, label, items }) => {
      const heading = `${label || EMPTY_GROUP_LABEL}\t(${code || EMPTY_GROUP_CODE})`;
      return [heading, ...items.map((item, index) => `${index + 1}. ${item}`)];
    })
    .join('\n');
}

function parseLearningStandardRows(
  value?: string | null
): LessonPlanFormValues['learningStandards'] {
  return splitItems(value ?? '').map((content) => ({ content }));
}

function serializeLearningStandardRows(rows: LessonPlanFormValues['learningStandards']) {
  return rows
    .map((row) => row.content.trim())
    .filter(Boolean)
    .join('\n');
}

function parseObjectiveFormGroups(
  value?: string | null
): LessonPlanFormValues['learningObjectives'] {
  return parseObjectives(value ?? '').map((group) => ({
    code: group.code,
    label: group.label,
    items: (group.items.length ? group.items : ['']).map((content) => ({ content })),
  }));
}

function serializeObjectiveFormGroups(
  groups: Array<{ code: string; label: string; items: Array<{ content: string }> }>
) {
  return serializeObjectives(
    groups.map((group) => ({
      code: group.code,
      label: group.label,
      items: group.items.map((item) => item.content),
    }))
  );
}

function cleanObjectives(groups: LessonPlanFormValues['learningObjectives']) {
  const cleanedGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.map((item) => item.content).filter((item) => item.trim()),
    }))
    .filter((group) => group.items.length);

  return serializeObjectives(cleanedGroups);
}

function parseIndicatorFormRows(value?: string | null): LessonPlanFormValues['indicators'] {
  const rows = parseIndicators(value);
  return rows.length ? rows : [{ code: '', description: '' }];
}

function objectivesToAssessmentIssues(groups: LessonPlanFormValues['learningObjectives']) {
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

function DynamicCurriculumField({
  label,
  addLabel,
  required,
  disabled,
  control,
}: {
  label: string;
  addLabel: string;
  required?: boolean;
  disabled: boolean;
  control: Control<LessonPlanFormValues>;
}) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'learningStandards',
  });

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1.25, fontWeight: 700 }}>
        {label}
        {required ? ' *' : ''}
      </Typography>
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        {fields.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              gap: 1,
              p: 1.5,
              display: 'grid',
              borderRadius: 1.5,
              gridTemplateColumns: '32px minmax(0, 1fr) 36px',
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                borderRadius: '50%',
                placeItems: 'center',
                color: 'primary.main',
                bgcolor: 'primary.lighter',
                typography: 'subtitle2',
              }}
            >
              {index + 1}
            </Box>
            <Field.Text
              required={required}
              multiline
              minRows={2}
              disabled={disabled}
              name={`learningStandards.${index}.content`}
              placeholder={`กรอก${label}`}
              slotProps={{ htmlInput: { 'aria-label': `${label} รายการที่ ${index + 1}` } }}
            />
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              aria-label={`ลบ${label} รายการที่ ${index + 1}`}
              onClick={() => (fields.length === 1 ? update(0, { content: '' }) : remove(index))}
            >
              <RemixIcon icon="solar:trash-bin-trash-linear" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button
        size="small"
        disabled={disabled}
        startIcon={<RemixIcon icon="mingcute:add-line" />}
        onClick={() => append({ content: '' })}
        sx={{ mt: 1 }}
      >
        {addLabel}
      </Button>
    </Box>
  );
}

function DynamicIndicatorsField({
  disabled,
  control,
}: {
  disabled: boolean;
  control: Control<LessonPlanFormValues>;
}) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'indicators',
  });

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1.25, fontWeight: 700 }}>
        ตัวชี้วัด / ผลการเรียนรู้
      </Typography>
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        {fields.map((row, index) => (
          <Box
            key={row.id}
            sx={{
              gap: 1,
              p: 1.5,
              display: 'grid',
              alignItems: 'flex-start',
              borderRadius: 1.5,
              gridTemplateColumns: '32px minmax(0, 1fr) 36px',
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                borderRadius: '50%',
                placeItems: 'center',
                color: 'primary.main',
                bgcolor: 'primary.lighter',
                typography: 'subtitle2',
              }}
            >
              {index + 1}
            </Box>
            <Box
              sx={{
                gap: 1.25,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr)' },
              }}
            >
              <Field.Text
                required
                disabled={disabled}
                name={`indicators.${index}.code`}
                label="รหัสตัวชี้วัด"
                placeholder="เช่น ว 1.2 ป.3/1"
              />
              <Field.Text
                required
                multiline
                minRows={2}
                disabled={disabled}
                name={`indicators.${index}.description`}
                label="รายละเอียดตัวชี้วัด"
                placeholder="ระบุพฤติกรรมหรือผลลัพธ์ที่ต้องการวัด"
              />
            </Box>
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              aria-label={`ลบตัวชี้วัดรายการที่ ${index + 1}`}
              onClick={() =>
                fields.length === 1 ? update(0, { code: '', description: '' }) : remove(index)
              }
            >
              <RemixIcon icon="solar:trash-bin-trash-linear" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button
        size="small"
        disabled={disabled}
        startIcon={<RemixIcon icon="mingcute:add-line" />}
        onClick={() => append({ code: '', description: '' })}
        sx={{ mt: 1 }}
      >
        เพิ่มตัวชี้วัดหรือผลการเรียนรู้
      </Button>
    </Box>
  );
}

function DynamicObjectivesField({
  disabled,
  control,
}: {
  disabled: boolean;
  control: Control<LessonPlanFormValues>;
}) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'learningObjectives',
  });

  return (
    <Box sx={{ gap: 2.5, display: 'grid' }}>
      <Box
        sx={{
          gap: 1,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography variant="h6">2. จุดประสงค์การเรียนรู้</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            กำหนดชื่อและรหัสของแต่ละด้านได้อย่างอิสระ
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          disabled={disabled}
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          onClick={() => append({ label: '', code: '', items: [{ content: '' }] })}
        >
          เพิ่มด้าน
        </Button>
      </Box>
      {fields.map((group, categoryIndex) => (
        <ObjectiveGroupFields
          key={group.id}
          control={control}
          disabled={disabled}
          categoryIndex={categoryIndex}
          onRemove={() =>
            fields.length === 1
              ? update(0, { label: '', code: '', items: [{ content: '' }] })
              : remove(categoryIndex)
          }
        />
      ))}
    </Box>
  );
}

function ObjectiveGroupFields({
  control,
  disabled,
  categoryIndex,
  onRemove,
}: {
  control: Control<LessonPlanFormValues>;
  disabled: boolean;
  categoryIndex: number;
  onRemove: () => void;
}) {
  const groupLabel = useWatch({
    control,
    name: `learningObjectives.${categoryIndex}.label`,
  });
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: `learningObjectives.${categoryIndex}.items`,
  });
  const groupName = groupLabel || `ด้านที่ ${categoryIndex + 1}`;

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.paper',
      }}
    >
      {categoryIndex ? <Divider sx={{ mb: 2.5 }} /> : null}
      <Box
        sx={{
          gap: 1,
          mb: 2,
          display: 'grid',
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr 80px', sm: 'minmax(0, 1fr) 120px 36px' },
        }}
      >
        <Field.Text
          required
          size="small"
          label="ชื่อด้าน"
          disabled={disabled}
          name={`learningObjectives.${categoryIndex}.label`}
          placeholder="เช่น ด้านความรู้ความเข้าใจ"
        />
        <Field.Text
          size="small"
          label="รหัส"
          disabled={disabled}
          name={`learningObjectives.${categoryIndex}.code`}
          placeholder="เช่น K"
        />
        <IconButton
          color="error"
          size="small"
          disabled={disabled}
          aria-label={`ลบ${groupName}`}
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: 'end' }}
          onClick={onRemove}
        >
          <RemixIcon icon="solar:trash-bin-trash-linear" />
        </IconButton>
      </Box>
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        {fields.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              gap: 1,
              display: 'grid',
              alignItems: 'flex-start',
              gridTemplateColumns: '32px minmax(0, 1fr) 36px',
            }}
          >
            <Typography variant="body2" sx={{ pt: 1.75, textAlign: 'center', fontWeight: 700 }}>
              {index + 1}.
            </Typography>
            <Field.Text
              required
              multiline
              minRows={2}
              disabled={disabled}
              name={`learningObjectives.${categoryIndex}.items.${index}.content`}
              placeholder={`กรอกจุดประสงค์${groupLabel || ''}`}
              slotProps={{
                htmlInput: { 'aria-label': `${groupName} รายการที่ ${index + 1}` },
              }}
            />
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              aria-label={`ลบ${groupName} รายการที่ ${index + 1}`}
              onClick={() => (fields.length === 1 ? update(0, { content: '' }) : remove(index))}
            >
              <RemixIcon icon="solar:trash-bin-trash-linear" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button
        size="small"
        disabled={disabled}
        startIcon={<RemixIcon icon="mingcute:add-line" />}
        onClick={() => append({ content: '' })}
        sx={{ mt: 1 }}
      >
        เพิ่มรายการใน{groupName}
      </Button>
    </Box>
  );
}

function toPayload(values: LessonPlanFormValues): LessonPlanInput {
  return {
    ...values,
    learningStandards: serializeLearningStandardRows(values.learningStandards),
    indicators: serializeIndicators(values.indicators),
    learningObjectives: cleanObjectives(values.learningObjectives),
    learningMedia: serializeLearningMedia(values.learningMedia),
    assessment: serializeAssessment(values.assessment),
    startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : '',
    endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : '',
  };
}

// ----------------------------------------------------------------------

export function LessonPlanFormView({
  lessonPlanId,
  templateId,
}: {
  lessonPlanId?: string;
  templateId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const initializedPlanId = useRef<string | null>(null);
  const initializedTemplateId = useRef<string | null>(null);
  const [activeSection, setActiveSection] = useState('lesson-plan-general');
  const [pdfOpen, setPdfOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [tabOrder, setTabOrder] = useState(DEFAULT_TAB_ORDER);

  useEffect(() => {
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
  }, []);

  const methods = useForm<LessonPlanFormValues>({
    resolver: zodResolver(LessonPlanSchema),
    defaultValues: EMPTY_FORM,
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
  const {
    fields: learningMediaFields,
    append: appendLearningMedia,
    remove: removeLearningMedia,
  } = useFieldArray({ control, name: 'learningMedia' });
  const { fields: assessmentFields, replace: replaceAssessment } = useFieldArray({
    control,
    name: 'assessment',
  });
  const startDate = useWatch({ control, name: 'startDate' });
  const selectedAssignmentId = useWatch({ control, name: 'teacherAssignmentId' });
  const selectedIndicatorIds = useWatch({ control, name: 'indicatorIds' });
  const learningObjectives = useWatch({ control, name: 'learningObjectives' });
  const navigationValues = useWatch({ control });

  useEffect(() => {
    const issues = objectivesToAssessmentIssues(learningObjectives);
    if (!issues.length) return;

    const currentRows = getValues('assessment');
    const nextRows = issues.map((issue, index) => ({
      issue,
      method: currentRows[index]?.method ?? '',
      tool: currentRows[index]?.tool ?? '',
      criteria: currentRows[index]?.criteria ?? '',
    }));

    if (
      currentRows.length !== nextRows.length ||
      nextRows.some((row, index) => row.issue !== currentRows[index]?.issue)
    ) {
      replaceAssessment(nextRows);
    }
  }, [getValues, learningObjectives, replaceAssessment]);

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

  useEffect(() => {
    const plan = planQuery.data;
    if (!plan || initializedPlanId.current === plan.id) return;

    reset({
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
      indicators: parseIndicatorFormRows(plan.indicators),
      learningObjectives: parseObjectiveFormGroups(plan.learning_objectives),
      essentialContent: plan.essential_content ?? '',
      learnerCompetencies: plan.learner_competencies ?? '',
      desiredCharacteristics: plan.desired_characteristics ?? '',
      guidingQuestions: plan.guiding_questions ?? '',
      learningActivities: plan.learning_activities ?? '',
      learningMedia: parseLearningMedia(plan.learning_media),
      assessment: parseAssessment(plan.assessment),
    });
    initializedPlanId.current = plan.id;
  }, [planQuery.data, reset]);

  useEffect(() => {
    if (!templateId || lessonPlanId || initializedTemplateId.current === templateId) return;
    const template = templatesQuery.data?.find((plan) => plan.id === templateId);
    if (!template) return;

    reset({
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
      indicators: parseIndicatorFormRows(template.indicators),
      learningObjectives: parseObjectiveFormGroups(template.learning_objectives),
      essentialContent: template.essential_content ?? '',
      learnerCompetencies: template.learner_competencies ?? '',
      desiredCharacteristics: template.desired_characteristics ?? '',
      guidingQuestions: template.guiding_questions ?? '',
      learningActivities: template.learning_activities ?? '',
      learningMedia: parseLearningMedia(template.learning_media),
      assessment: parseAssessment(template.assessment),
    });
    initializedTemplateId.current = templateId;
  }, [lessonPlanId, reset, templateId, templatesQuery.data]);

  const markTabClean = (tab?: string) => {
    TAB_FORM_FIELDS[tab ?? '']?.forEach((fieldName) => {
      resetField(fieldName, { defaultValue: getValues(fieldName) });
    });
  };

  const saveMutation = useMutation({
    mutationFn: ({
      values,
      saveMode,
      tab,
    }: {
      values: LessonPlanFormValues;
      saveMode?: 'draft';
      tab?: string;
    }) => {
      const payload = toPayload(values);
      return lessonPlanId
        ? updateLessonPlan(lessonPlanId, {
            ...payload,
            expectedVersion: planQuery.data!.version_number,
            saveMode,
            tab,
            changeNote: saveMode === 'draft' ? `บันทึก ${tab ?? 'ฉบับร่าง'}` : undefined,
          })
        : createLessonPlan({ ...payload, saveMode, tab });
    },
    onSuccess: (savedPlan, variables) => {
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

  const applyCurriculum = (assignmentId: string) => {
    const assignment = optionsQuery.data?.find((option) => option.id === assignmentId);
    const subject = assignment?.subject;
    if (!subject) return;

    const linkedIndicators = subject.curriculum_indicators ?? [];
    const gradeLevel = assignment?.classroom?.grade_level;
    setValue('curriculumId', subject.curriculum_id, { shouldDirty: true });
    setValue('subjectId', subject.id, { shouldDirty: true });
    setValue('unitId', null, { shouldDirty: true });
    setValue('learningOutcomeIds', [], { shouldDirty: true });
    setValue('gradeLevels', gradeLevel ? [gradeLevel] : subject.grade_levels ?? [], {
      shouldDirty: true,
    });
    setValue('indicatorIds', linkedIndicators.map((indicator) => indicator.id), {
      shouldDirty: true,
      shouldValidate: true,
    });

    const linkedStandards = [
      ...new Set(
        linkedIndicators
          .map((indicator) => indicator.learning_standard?.trim())
          .filter((value): value is string => Boolean(value))
      ),
    ];
    setValue(
      'learningStandards',
      parseLearningStandardRows(
        linkedStandards.length ? linkedStandards.join('\n') : subjectLearningStandardText(subject)
      ),
      {
        shouldDirty: true,
      }
    );
    setValue(
      'indicators',
      linkedIndicators.length
        ? linkedIndicators.map(({ code, description }) => ({ code, description }))
        : parseIndicatorFormRows(plainText(subject.indicators)),
      { shouldDirty: true }
    );
  };

  const selectAssignment = (assignmentId: string) => {
    const assignment = optionsQuery.data?.find((option) => option.id === assignmentId);
    const subject = assignment?.subject;

    setValue('teacherAssignmentId', assignmentId, { shouldDirty: true, shouldValidate: true });
    setValue('subjectId', subject?.id ?? null, { shouldDirty: true });
    setValue('curriculumId', subject?.curriculum_id ?? null, { shouldDirty: true });
    setValue(
      'gradeLevels',
      assignment?.classroom?.grade_level
        ? [assignment.classroom.grade_level]
        : subject?.grade_levels ?? [],
      { shouldDirty: true }
    );
    if (!getValues('title')) {
      setValue('title', subject ? `แผนการสอน ${subject.name}` : '', { shouldDirty: true });
    }
    if (!templateId) applyCurriculum(assignmentId);
  };

  const selectUnit = (unitId: string) => {
    const unit = selectedAssignment?.subject?.learning_units_structured.find(
      (item) => item.id === unitId
    );
    setValue('unitId', unit?.id ?? null, { shouldDirty: true });
    if (!unit) return;
    setValue('unitName', unit.name, { shouldDirty: true, shouldValidate: true });
    if (unit.estimated_periods) {
      setValue('durationPeriods', unit.estimated_periods, { shouldDirty: true });
    }
  };

  const selectIndicators = (indicatorIds: string[]) => {
    const subject = selectedAssignment?.subject;
    if (!subject) return;
    const selected = subject.curriculum_indicators.filter((indicator) =>
      indicatorIds.includes(indicator.id)
    );
    setValue('indicatorIds', indicatorIds, { shouldDirty: true, shouldValidate: true });
    setValue(
      'indicators',
      selected.length
        ? selected.map(({ code, description }) => ({ code, description }))
        : [{ code: '', description: '' }],
      { shouldDirty: true, shouldValidate: true }
    );
    const standards = [
      ...new Set(
        selected
          .map((indicator) => indicator.learning_standard?.trim())
          .filter((value): value is string => Boolean(value))
      ),
    ];
    setValue(
      'learningStandards',
      parseLearningStandardRows(
        standards.length ? standards.join('\n') : subjectLearningStandardText(subject)
      ),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const isEditable = !planQuery.data || ['draft', 'revision'].includes(planQuery.data.status);
  const onSubmit = handleSubmit((values) => saveMutation.mutate({ values }));
  const navigationSectionCandidates = [
    {
      id: 'lesson-plan-general',
      label: 'ข้อมูลทั่วไป',
      complete: Boolean(
        navigationValues.teacherAssignmentId &&
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
        Boolean(navigationValues.indicators?.length) &&
        Boolean(navigationValues.indicators?.every((row) => Boolean(row.code && row.description))),
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
      complete: Boolean(plainText(navigationValues.learningActivities)),
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
  ];
  const savedTabs = new Set(planQuery.data?.saved_tabs ?? []);
  const navigationSections = navigationSectionCandidates
    .map((section) => ({
      ...section,
      complete:
        section.complete &&
        savedTabs.has(section.id) &&
        !TAB_FORM_FIELDS[section.id]?.some((fieldName) => Boolean(dirtyFields[fieldName])),
    }))
    .sort((first, second) => tabOrder.indexOf(first.id) - tabOrder.indexOf(second.id));
  const activeSectionIndex = Math.max(
    navigationSections.findIndex((section) => section.id === activeSection),
    0
  );
  const activeNavigationSection = navigationSections[activeSectionIndex];

  const goToSection = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const updateTabOrder = (nextOrder: string[]) => {
    setTabOrder(nextOrder);
    localStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(nextOrder));
  };

  const moveTab = (tabId: string, offset: number) => {
    const currentIndex = tabOrder.indexOf(tabId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= tabOrder.length) return;

    const nextOrder = [...tabOrder];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [
      nextOrder[nextIndex],
      nextOrder[currentIndex],
    ];
    updateTabOrder(nextOrder);
  };

  const handleTabDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) return;

    const nextOrder = navigationSections.map((section) => section.id);
    const [movedTabId] = nextOrder.splice(source.index, 1);
    nextOrder.splice(destination.index, 0, movedTabId);
    updateTabOrder(nextOrder);
  };

  const saveCurrentTab = async () => {
    const values = getValues();
    if (!values.teacherAssignmentId) {
      toast.warning('กรุณาเลือกรายวิชาและห้องเรียนก่อนบันทึกฉบับร่าง');
      goToSection('lesson-plan-general');
      return;
    }

    const currentTabFields = TAB_FORM_FIELDS[activeSection] ?? [];
    const isCurrentTabValid = await trigger(currentTabFields, { shouldFocus: true });
    if (!isCurrentTabValid) {
      toast.warning('กรุณากรอกข้อมูลใน Step นี้ให้ครบก่อนบันทึก');
      return;
    }

    saveMutation.mutate({ values: getValues(), saveMode: 'draft', tab: activeSection });
  };

  if (planQuery.isLoading || templatesQuery.isLoading) return <LinearProgress />;

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
          href={paths.teacher.lessonPlans.root}
          color="inherit"
          size="small"
          startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
          sx={{ mb: 1.5, color: 'text.secondary' }}
        >
          กลับไปหน้าแผนการสอน
        </Button>
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography component="h1" variant="h3">
          {lessonPlanId ? 'แก้ไขแผนการสอน' : 'สร้างแผนการสอน'}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          เลือกรายวิชาที่ได้รับมอบหมาย ระบบจะเติมหลักสูตรและตัวชี้วัดตั้งต้นให้อัตโนมัติ
        </Typography>
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
      {saveMutation.isError ||
      optionsQuery.isError ||
      planQuery.isError ||
      templatesQuery.isError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveMutation.error?.message ??
            optionsQuery.error?.message ??
            planQuery.error?.message ??
            templatesQuery.error?.message}
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
          <Card
            component="nav"
            variant="outlined"
            aria-label="หัวข้อแผนการสอน"
            sx={{
              p: 0,
              top: 88,
              zIndex: 5,
              position: { md: 'sticky' },
              maxHeight: { md: 'calc(100vh - 112px)' },
              overflowY: { md: 'auto' },
              boxShadow: 'none',
              border: 'none',
              borderRadius: 0,
            }}
          >
            <Typography variant="subtitle2" sx={{ px: 1.25, py: 1 }}>
              หัวข้อแผนการสอน
            </Typography>
            <DragDropContext onDragEnd={handleTabDragEnd}>
              <Droppable droppableId="lesson-plan-nav">
                {(droppableProvided) => (
                  <Box
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                    sx={{
                      gap: 1,
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, minmax(0, 1fr))',
                        sm: 'repeat(3, minmax(0, 1fr))',
                        md: '1fr',
                      },
                    }}
                  >
                    {navigationSections.map((section, index) => (
                      <DraggableLessonPlanTab
                        key={section.id}
                        section={section}
                        index={index}
                        active={activeSection === section.id}
                        onMove={moveTab}
                        onSelect={goToSection}
                      />
                    ))}
                    {droppableProvided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          </Card>

          <Box
            sx={{
              gap: 3,
              display: 'grid',
            }}
          >
            <Card
              id="lesson-plan-general"
              variant="outlined"
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                display: activeSection === 'lesson-plan-general' ? 'block' : 'none',
              }}
            >
              <Typography variant="h5">ข้อมูลแผน</Typography>
              <Box
                sx={{
                  gap: 2.5,
                  mt: 2.5,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <Field.Select
                  required
                  name="teacherAssignmentId"
                  disabled={!isEditable}
                  label="รายวิชาและห้องเรียน"
                  onChange={(event) => selectAssignment(event.target.value)}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                >
                  {(optionsQuery.data ?? []).map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.subject?.code ? `${option.subject.code} · ` : ''}
                      {option.subject?.name} · {option.classroom?.name} · {option.semester?.name}
                    </MenuItem>
                  ))}
                </Field.Select>
                {selectedAssignment?.subject?.learning_units_structured.length ? (
                  <Field.Select
                    name="unitId"
                    label="หน่วยการเรียนรู้จากรายวิชา"
                    disabled={!isEditable}
                    onChange={(event) => selectUnit(event.target.value)}
                    helperText="เลือกแล้วระบบจะเติมชื่อหน่วยและจำนวนคาบตั้งต้นให้"
                    sx={{ gridColumn: { sm: '1 / -1' } }}
                  >
                    <MenuItem value="">กำหนดหน่วยเฉพาะแผนนี้</MenuItem>
                    {selectedAssignment.subject.learning_units_structured.map((unit) => (
                      <MenuItem key={unit.id} value={unit.id}>
                        {unit.code ? `${unit.code} · ` : ''}{unit.name}
                      </MenuItem>
                    ))}
                  </Field.Select>
                ) : null}
                <Field.Text
                  required
                  disabled={!isEditable}
                  name="title"
                  label="ชื่อแผนการสอน"
                  placeholder="เช่น แผนการจัดการเรียนรู้เรื่องแรงและการเคลื่อนที่"
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <Field.Text
                  required
                  disabled={!isEditable}
                  type="number"
                  name="unitNumber"
                  label="หน่วยที่"
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <Field.Text
                  required
                  disabled={!isEditable}
                  name="unitName"
                  label="ชื่อหน่วยการเรียนรู้"
                />
                <Field.Text
                  required
                  disabled={!isEditable}
                  type="number"
                  name="durationPeriods"
                  label="จำนวนคาบ"
                  slotProps={{ htmlInput: { min: 1, max: 200 } }}
                />
                <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <Field.DatePicker
                    name="startDate"
                    label="เริ่มใช้"
                    disabled={!isEditable}
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <Field.DatePicker
                    name="endDate"
                    label="ถึงวันที่"
                    disabled={!isEditable}
                    format="DD/MM/YYYY"
                    minDate={startDate ? dayjs(startDate) : undefined}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Box>
              </Box>
            </Card>

            <Box
              sx={{
                gap: 3,
                display: 'grid',
              }}
            >
              <Card
                id="lesson-plan-standards"
                variant="outlined"
                sx={{
                  gap: 2.5,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-standards' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box
                  sx={{
                    gap: 1.5,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Box>
                    <Typography variant="h6">
                      1. มาตรฐานการเรียนรู้ / ตัวชี้วัด / ผลการเรียนรู้
                    </Typography>
                    {selectedAssignment?.subject ? (
                      <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                        เชื่อมกับหลักสูตร{' '}
                        {selectedAssignment.subject.code
                          ? `${selectedAssignment.subject.code} · `
                          : ''}
                        {selectedAssignment.subject.name}
                      </Typography>
                    ) : null}
                  </Box>
                  <Button
                    size="small"
                    color="inherit"
                    variant="outlined"
                    disabled={!isEditable || !selectedAssignment?.subject}
                    startIcon={<RemixIcon icon="solar:refresh-linear" />}
                    onClick={() => applyCurriculum(selectedAssignmentId)}
                  >
                    ดึงข้อมูลล่าสุด
                  </Button>
                </Box>
                {selectedAssignment?.subject?.curriculum_indicators.length ? (
                  <Controller
                    name="indicatorIds"
                    control={control}
                    render={({ fieldState }) => (
                      <Autocomplete
                        multiple
                        disabled={!isEditable}
                        options={selectedAssignment.subject!.curriculum_indicators}
                        value={selectedAssignment.subject!.curriculum_indicators.filter(
                          (indicator) => selectedIndicatorIds.includes(indicator.id)
                        )}
                        getOptionLabel={(option) => `${option.code} · ${option.description}`}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, value) => {
                          selectIndicators(value.map((indicator) => indicator.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            required
                            label="ตัวชี้วัดจากคลังรายวิชา"
                            error={Boolean(fieldState.error)}
                            helperText={
                              fieldState.error?.message ??
                              'เลือกจาก object เดียวกับหน้า Template และหน้ารายวิชา'
                            }
                          />
                        )}
                      />
                    )}
                  />
                ) : (
                  <Alert severity="info">
                    รายวิชานี้ยังไม่มีตัวชี้วัดแบบโครงสร้าง จึงใช้ข้อมูลข้อความเดิมได้ชั่วคราว
                  </Alert>
                )}
                {selectedAssignment?.subject?.learning_outcomes_structured.length ? (
                  <Controller
                    name="learningOutcomeIds"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        disabled={!isEditable}
                        options={selectedAssignment.subject!.learning_outcomes_structured}
                        value={selectedAssignment.subject!.learning_outcomes_structured.filter(
                          (item) => field.value.includes(item.id)
                        )}
                        getOptionLabel={(option) =>
                          `${option.code ? `${option.code} · ` : ''}${option.description}`
                        }
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, value) => field.onChange(value.map((item) => item.id))}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="ผลลัพธ์การเรียนรู้รายวิชาที่ใช้ในแผน"
                            helperText="เป็น reference จากรายวิชา ไม่ถูกนำไปเขียนทับจุดประสงค์ของแผน"
                          />
                        )}
                      />
                    )}
                  />
                ) : null}
                <DynamicCurriculumField
                  label="มาตรฐานการเรียนรู้"
                  addLabel="เพิ่มมาตรฐานการเรียนรู้"
                  disabled={
                    !isEditable ||
                    Boolean(selectedAssignment?.subject?.curriculum_indicators.length)
                  }
                  control={control}
                />
                <Divider />
                <DynamicIndicatorsField
                  disabled={
                    !isEditable ||
                    Boolean(selectedAssignment?.subject?.curriculum_indicators.length)
                  }
                  control={control}
                />
              </Card>

              <Card
                id="lesson-plan-objectives"
                variant="outlined"
                sx={{
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-objectives' ? 'block' : 'none',
                }}
              >
                <DynamicObjectivesField disabled={!isEditable} control={control} />
              </Card>

              <Card
                id="lesson-plan-essential"
                variant="outlined"
                sx={{
                  gap: 2,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-essential' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box>
                  <Typography variant="h6">3. สาระสำคัญ</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    จัดรูปแบบย่อหน้า ตัวหนา ลำดับเลข และหัวข้อย่อยด้วยเครื่องมือแก้ไขข้อความ
                  </Typography>
                </Box>
                <Field.Editor
                  name="essentialContent"
                  editable={isEditable}
                  placeholder="อธิบายแนวคิด เนื้อหา และสาระสำคัญของหน่วยการเรียนรู้"
                />
              </Card>

              <Card
                id="lesson-plan-characteristics"
                variant="outlined"
                sx={{
                  gap: 2,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-characteristics' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box>
                  <Typography variant="h6">5. คุณลักษณะอันพึงประสงค์</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    ระบุคุณลักษณะและพฤติกรรมที่ต้องการส่งเสริมให้เกิดกับผู้เรียน
                  </Typography>
                </Box>
                <Field.Editor
                  name="desiredCharacteristics"
                  editable={isEditable}
                  placeholder="เช่น มีวินัย ใฝ่เรียนรู้ มุ่งมั่นในการทำงาน และมีจิตสาธารณะ"
                />
              </Card>

              <Card
                id="lesson-plan-competencies"
                variant="outlined"
                sx={{
                  gap: 2,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-competencies' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box>
                  <Typography variant="h6">4. สมรรถนะสำคัญของผู้เรียน</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    ระบุสมรรถนะและพฤติกรรมที่ผู้เรียนจะพัฒนาจากแผนการสอนนี้
                  </Typography>
                </Box>
                <Field.Editor
                  name="learnerCompetencies"
                  editable={isEditable}
                  placeholder="เช่น ความสามารถในการสื่อสาร การคิด การแก้ปัญหา การใช้ทักษะชีวิต และการใช้เทคโนโลยี"
                />
              </Card>

              <Card
                id="lesson-plan-questions"
                variant="outlined"
                sx={{
                  gap: 2,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-questions' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box>
                  <Typography variant="h6">6. คำถามหลัก (Big Question)</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    สร้างคำถามปลายเปิดเพื่อกระตุ้นการคิด วิเคราะห์ และเชื่อมโยงเนื้อหา
                  </Typography>
                </Box>
                <Field.Editor
                  name="guidingQuestions"
                  editable={isEditable}
                  placeholder="เพิ่มคำถามหลักและจัดเป็นรายการลำดับเลข"
                />
              </Card>

              <Card
                id="lesson-plan-activities"
                variant="outlined"
                sx={{
                  gap: 2,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-activities' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box>
                  <Typography variant="h6">7. กิจกรรมการเรียนรู้ *</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    จัดกิจกรรมตามชั่วโมง ขั้นนำเข้าสู่บทเรียน ขั้นกิจกรรม และขั้นสรุป
                  </Typography>
                </Box>
                <Field.Editor
                  name="learningActivities"
                  editable={isEditable}
                  placeholder="ระบุชั่วโมงและขั้นตอนกิจกรรม พร้อมจัดเป็นหัวข้อและรายการย่อย"
                />
              </Card>

              <Card
                id="lesson-plan-media"
                variant="outlined"
                sx={{
                  gap: 2,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-media' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box
                  sx={{
                    gap: 1,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Box>
                    <Typography variant="h6">8. สื่อและแหล่งเรียนรู้</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                      เพิ่มหนังสือ แบบฝึกหัด อุปกรณ์ ใบงาน หรือแหล่งเรียนรู้ทีละรายการ
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!isEditable}
                    startIcon={<RemixIcon icon="mingcute:add-line" />}
                    onClick={() => appendLearningMedia({ content: '' })}
                  >
                    เพิ่มสื่อ
                  </Button>
                </Box>

                {learningMediaFields.length ? (
                  <Box sx={{ gap: 1.25, display: 'grid' }}>
                    {learningMediaFields.map((media, index) => (
                      <Box
                        key={media.id}
                        sx={{
                          gap: 1,
                          display: 'grid',
                          alignItems: 'center',
                          gridTemplateColumns: '48px minmax(0, 1fr) 40px',
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ textAlign: 'right' }}>
                          8.{index + 1}
                        </Typography>
                        <Field.Text
                          disabled={!isEditable}
                          name={`learningMedia.${index}.content`}
                          label={`สื่อหรือแหล่งเรียนรู้รายการที่ ${index + 1}`}
                        />
                        <IconButton
                          color="error"
                          size="small"
                          disabled={!isEditable}
                          aria-label={`ลบสื่อรายการที่ ${index + 1}`}
                          onClick={() => removeLearningMedia(index)}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-linear" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info">กด “เพิ่มสื่อ” เพื่อเพิ่มสื่อหรือแหล่งเรียนรู้</Alert>
                )}
              </Card>

              <Card
                id="lesson-plan-assessment"
                variant="outlined"
                sx={{
                  gap: 2,
                  p: { xs: 2.5, sm: 3.5 },
                  display: activeSection === 'lesson-plan-assessment' ? 'grid' : 'none',
                  scrollMarginTop: 96,
                }}
              >
                <Box
                  sx={{
                    gap: 1,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Box>
                    <Typography variant="h6">9. การวัดและประเมินผลการเรียนรู้ *</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                      ประเด็นการประเมินดึงจากจุดประสงค์การเรียนรู้โดยอัตโนมัติ
                    </Typography>
                  </Box>
                </Box>

                {assessmentFields.length ? (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box
                      sx={{
                        gap: 1,
                        px: 1,
                        mb: 1,
                        minWidth: { sm: 900 },
                        display: { xs: 'none', sm: 'grid' },
                        gridTemplateColumns: '36px repeat(4, minmax(180px, 1fr))',
                      }}
                    >
                      <Box />
                      {[
                        'ประเด็นการประเมิน',
                        'วิธีการประเมิน',
                        'เครื่องมือการประเมิน',
                        'เกณฑ์การประเมิน',
                      ].map((label) => (
                        <Typography key={label} variant="subtitle2" sx={{ textAlign: 'center' }}>
                          {label}
                        </Typography>
                      ))}
                    </Box>

                    <Box sx={{ gap: 1.25, display: 'grid' }}>
                      {assessmentFields.map((row, index) => (
                        <Box
                          key={row.id}
                          sx={{
                            gap: 1,
                            p: 1,
                            display: 'grid',
                            minWidth: { sm: 900 },
                            alignItems: 'flex-start',
                            borderRadius: 1.5,
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            gridTemplateColumns: {
                              xs: 'minmax(0, 1fr)',
                              sm: '36px repeat(4, minmax(180px, 1fr))',
                            },
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ pt: { sm: 2 }, textAlign: 'center' }}
                          >
                            {index + 1}
                          </Typography>
                          {(
                            [
                              ['issue', 'ประเด็นการประเมิน'],
                              ['method', 'วิธีการประเมิน'],
                              ['tool', 'เครื่องมือการประเมิน'],
                              ['criteria', 'เกณฑ์การประเมิน'],
                            ] as const
                          ).map(([fieldName, label]) => (
                            <Field.Text
                              key={fieldName}
                              required
                              multiline
                              minRows={3}
                              disabled={!isEditable || fieldName === 'issue'}
                              name={`assessment.${index}.${fieldName}`}
                              label={label}
                              sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
                            />
                          ))}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="warning">
                    กรุณากรอกจุดประสงค์การเรียนรู้ก่อนกำหนดการวัดและประเมินผล
                  </Alert>
                )}
              </Card>
            </Box>
          </Box>
        </Box>

        <Card
          variant="outlined"
          sx={{
            p: 2,
            mt: 'auto',
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
              justifyContent: 'space-between',
              flexDirection: { xs: 'column-reverse', sm: 'row' },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'primary.main' }}>
                ขั้นตอนที่ {activeSectionIndex + 1} จาก {navigationSections.length}
              </Typography>
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary' }}
              >
                {planQuery.data?.status === 'revision' ? 'ฉบับแก้ไข' : 'ฉบับร่าง'} · เวอร์ชัน{' '}
                {planQuery.data?.version_number ?? 1} · บันทึกเฉพาะ Tab “
                {activeNavigationSection.label}”
              </Typography>
            </Box>
            <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {lessonPlanId && activeSection in TAB_TEMPLATE_TYPES ? (
                <Button
                  type="button"
                  color="primary"
                  size="large"
                  variant="outlined"
                  disabled={!isEditable}
                  startIcon={<RemixIcon icon="solar:documents-linear" />}
                  onClick={() => setTemplatePickerOpen(true)}
                >
                  ใช้ Template
                </Button>
              ) : null}
              <Button
                type="button"
                color="inherit"
                size="large"
                variant="outlined"
                startIcon={<RemixIcon icon="solar:printer-minimalistic-linear" />}
                onClick={() => setPdfOpen(true)}
              >
                พรีวิว PDF
              </Button>
              <Button
                component={RouterLink}
                href={paths.teacher.lessonPlans.root}
                color="inherit"
                size="large"
                disabled={saveMutation.isPending}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                size="large"
                variant="contained"
                disabled={!isEditable}
                loading={saveMutation.isPending}
                startIcon={<RemixIcon icon="solar:diskette-linear" />}
                onClick={saveCurrentTab}
                sx={{ minWidth: 170 }}
              >
                บันทึก
              </Button>
            </Box>
          </Box>
        </Card>
      </Form>

      {pdfOpen ? (
        <LessonPlanPdfDialog
          open
          onClose={() => setPdfOpen(false)}
          plan={toPayload(getValues())}
          assignment={selectedAssignment}
          version={planQuery.data?.version_number ?? 1}
        />
      ) : null}

      {lessonPlanId && activeSection in TAB_TEMPLATE_TYPES ? (
        <LessonPlanTemplatePickerDialog
          open={templatePickerOpen}
          onClose={() => setTemplatePickerOpen(false)}
          lessonPlanId={lessonPlanId}
          templateType={TAB_TEMPLATE_TYPES[activeSection as keyof typeof TAB_TEMPLATE_TYPES]}
          onApplied={async () => {
            initializedPlanId.current = null;
            await planQuery.refetch();
          }}
        />
      ) : null}
    </Container>
  );
}
