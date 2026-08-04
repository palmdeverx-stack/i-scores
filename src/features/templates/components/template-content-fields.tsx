'use client';

import type { TemplateType, RubricContent } from '../types';

import { useWatch, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { TEMPLATE_TYPES } from '../constants';

function uid() {
  return crypto.randomUUID();
}

function RowActions({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <IconButton
        size="small"
        disabled={index === 0}
        aria-label="เลื่อนขึ้น"
        onClick={() => onMove(index, index - 1)}
      >
        <RemixIcon icon="solar:alt-arrow-up-linear" />
      </IconButton>
      <IconButton
        size="small"
        disabled={index === total - 1}
        aria-label="เลื่อนลง"
        onClick={() => onMove(index, index + 1)}
      >
        <RemixIcon icon="solar:alt-arrow-down-linear" />
      </IconButton>
      <IconButton size="small" color="error" aria-label="ลบรายการ" onClick={onRemove}>
        <RemixIcon icon="solar:trash-bin-trash-linear" />
      </IconButton>
    </Box>
  );
}

function useArrayValue<T>(name: string) {
  const { control, setValue } = useFormContext();
  const value = (useWatch({ control, name }) ?? []) as T[];
  const update = (next: T[]) => setValue(name, next, { shouldDirty: true, shouldValidate: true });
  const remove = (index: number) => update(value.filter((_, rowIndex) => rowIndex !== index));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  };
  return { value, update, remove, move };
}

function StringListField({
  name,
  label,
  addLabel,
}: {
  name: string;
  label: string;
  addLabel?: string;
}) {
  const rows = useArrayValue<string>(name);
  return (
    <Box sx={{ gap: 1.25, display: 'grid' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Button
          size="small"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          onClick={() => rows.update([...rows.value, ''])}
        >
          {addLabel ?? 'เพิ่มรายการ'}
        </Button>
      </Box>
      {rows.value.map((_, index) => (
        <Box
          key={`${name}-${index}`}
          sx={{ gap: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto' }}
        >
          <Field.Text name={`${name}.${index}`} label={`${label} ${index + 1}`} />
          <RowActions
            index={index}
            total={rows.value.length}
            onMove={rows.move}
            onRemove={() => rows.remove(index)}
          />
        </Box>
      ))}
    </Box>
  );
}

function TopicsFields() {
  const rows = useArrayValue<{ id: string; title: string; description?: string; order: number }>(
    'content.topics'
  );
  return (
    <ObjectList
      title="หัวข้อสาระการเรียนรู้"
      onAdd={() =>
        rows.update([
          ...rows.value,
          { id: uid(), title: '', description: '', order: rows.value.length },
        ])
      }
    >
      {rows.value.map((row, index) => (
        <Box
          key={row.id}
          sx={{
            p: 2,
            gap: 1.5,
            display: 'grid',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Field.Text
            required
            name={`content.topics.${index}.title`}
            label={`หัวข้อที่ ${index + 1}`}
          />
          <Field.Text
            multiline
            minRows={2}
            name={`content.topics.${index}.description`}
            label="คำอธิบาย"
          />
          <RowActions
            index={index}
            total={rows.value.length}
            onMove={rows.move}
            onRemove={() => rows.remove(index)}
          />
        </Box>
      ))}
    </ObjectList>
  );
}

function QuestionsFields() {
  const rows = useArrayValue<{
    id: string;
    question: string;
    bloomLevel?: string;
    expectedAnswer?: string;
    followUpQuestions?: string[];
  }>('content.questions');
  return (
    <ObjectList
      title="รายการคำถาม"
      onAdd={() =>
        rows.update([
          ...rows.value,
          {
            id: uid(),
            question: '',
            bloomLevel: 'understand',
            expectedAnswer: '',
            followUpQuestions: [],
          },
        ])
      }
    >
      {rows.value.map((row, index) => (
        <Box
          key={row.id}
          sx={{
            p: 2,
            gap: 1.5,
            display: 'grid',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Field.Text
            required
            multiline
            name={`content.questions.${index}.question`}
            label={`คำถามที่ ${index + 1}`}
          />
          <Field.Select name={`content.questions.${index}.bloomLevel`} label="ระดับ Bloom">
            {['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Field.Select>
          <Field.Text
            multiline
            name={`content.questions.${index}.expectedAnswer`}
            label="คำตอบที่คาดหวัง"
          />
          <StringListField
            name={`content.questions.${index}.followUpQuestions`}
            label="คำถามต่อยอด"
          />
          <RowActions
            index={index}
            total={rows.value.length}
            onMove={rows.move}
            onRemove={() => rows.remove(index)}
          />
        </Box>
      ))}
    </ObjectList>
  );
}

function ReflectionFields() {
  const rows = useArrayValue<{
    id: string;
    title: string;
    placeholder?: string;
    required?: boolean;
  }>('content.sections');
  return (
    <ObjectList
      title="หัวข้อบันทึกหลังสอน"
      onAdd={() =>
        rows.update([...rows.value, { id: uid(), title: '', placeholder: '', required: false }])
      }
    >
      {rows.value.map((row, index) => (
        <Box
          key={row.id}
          sx={{
            p: 2,
            gap: 1.5,
            display: 'grid',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Field.Text
            required
            name={`content.sections.${index}.title`}
            label={`หัวข้อที่ ${index + 1}`}
          />
          <Field.Text
            multiline
            name={`content.sections.${index}.placeholder`}
            label="ข้อความแนะนำ"
          />
          <Field.Switch name={`content.sections.${index}.required`} label="บังคับกรอก" />
          <RowActions
            index={index}
            total={rows.value.length}
            onMove={rows.move}
            onRemove={() => rows.remove(index)}
          />
        </Box>
      ))}
    </ObjectList>
  );
}

function LessonPlanSectionsFields() {
  const rows = useArrayValue<{
    id: string;
    sectionType: TemplateType;
    templateId?: string;
    title: string;
    order: number;
    required: boolean;
  }>('content.sections');
  return (
    <ObjectList
      title="Section ของแผนการสอน"
      onAdd={() =>
        rows.update([
          ...rows.value,
          {
            id: uid(),
            sectionType: 'learning_objective',
            title: '',
            order: rows.value.length,
            required: true,
          },
        ])
      }
    >
      {rows.value.map((row, index) => (
        <Box
          key={row.id}
          sx={{
            p: 2,
            gap: 1.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Field.Text
            required
            name={`content.sections.${index}.title`}
            label={`ชื่อ Section ${index + 1}`}
          />
          <Field.Select name={`content.sections.${index}.sectionType`} label="ประเภท">
            {TEMPLATE_TYPES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Field.Select>
          <Field.Text
            name={`content.sections.${index}.templateId`}
            label="Template ID อ้างอิง (ถ้ามี)"
          />
          <Field.Switch name={`content.sections.${index}.required`} label="บังคับใช้" />
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <RowActions
              index={index}
              total={rows.value.length}
              onMove={rows.move}
              onRemove={() => rows.remove(index)}
            />
          </Box>
        </Box>
      ))}
    </ObjectList>
  );
}

function ObjectList({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ gap: 1.5, display: 'grid' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1">{title}</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          onClick={onAdd}
        >
          เพิ่มรายการ
        </Button>
      </Box>
      {children}
    </Box>
  );
}

function RubricFields() {
  const rows = useArrayValue<RubricContent['criteria'][number]>('content.criteria');
  const totalWeight = rows.value.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  const addCriterion = () =>
    rows.update([
      ...rows.value,
      {
        id: uid(),
        name: '',
        description: '',
        weight: 0,
        levels: [{ id: uid(), level: 1, label: 'ผ่าน', score: 1, description: '' }],
      },
    ]);
  const updateLevels = (
    criterionIndex: number,
    levels: RubricContent['criteria'][number]['levels']
  ) => {
    const next = [...rows.value];
    next[criterionIndex] = { ...next[criterionIndex], levels };
    rows.update(next);
  };
  return (
    <Box sx={{ gap: 2, display: 'grid' }}>
      <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <Field.Select name="content.rubricType" label="ประเภทรูบริก">
          {['analytic', 'holistic', 'checklist', 'rating_scale'].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Select name="content.scoreType" label="รูปแบบคะแนน">
          {['score', 'percentage', 'level'].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Text type="number" name="content.maximumScore" label="คะแนนเต็ม" />
        <Field.Text type="number" name="content.passingScore" label="คะแนนผ่าน" />
      </Box>
      {totalWeight > 100 ? (
        <Alert severity="error">น้ำหนักรวม {totalWeight}% เกิน 100%</Alert>
      ) : (
        <Alert severity="info">น้ำหนักรวม {totalWeight}%</Alert>
      )}
      <ObjectList title="เกณฑ์การประเมิน" onAdd={addCriterion}>
        {rows.value.map((criterion, criterionIndex) => (
          <Box
            key={criterion.id}
            sx={{
              p: 2,
              gap: 1.5,
              display: 'grid',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
            }}
          >
            <Box
              sx={{
                gap: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 150px' },
              }}
            >
              <Field.Text
                required
                name={`content.criteria.${criterionIndex}.name`}
                label={`เกณฑ์ที่ ${criterionIndex + 1}`}
              />
              <Field.Text
                type="number"
                name={`content.criteria.${criterionIndex}.weight`}
                label="น้ำหนัก (%)"
              />
            </Box>
            <Field.Text
              multiline
              name={`content.criteria.${criterionIndex}.description`}
              label="คำอธิบายเกณฑ์"
            />
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">ระดับคะแนน</Typography>
              <Button
                size="small"
                onClick={() =>
                  updateLevels(criterionIndex, [
                    ...criterion.levels,
                    {
                      id: uid(),
                      level: criterion.levels.length + 1,
                      label: '',
                      score: 0,
                      description: '',
                    },
                  ])
                }
              >
                เพิ่มระดับ
              </Button>
            </Box>
            {criterion.levels.map((level, levelIndex) => (
              <Box
                key={level.id}
                sx={{
                  gap: 1,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '100px 160px 100px minmax(220px, 1fr) 40px',
                  },
                }}
              >
                <Field.Text
                  type="number"
                  name={`content.criteria.${criterionIndex}.levels.${levelIndex}.level`}
                  label="ระดับ"
                />
                <Field.Text
                  name={`content.criteria.${criterionIndex}.levels.${levelIndex}.label`}
                  label="ชื่อระดับ"
                />
                <Field.Text
                  type="number"
                  name={`content.criteria.${criterionIndex}.levels.${levelIndex}.score`}
                  label="คะแนน"
                />
                <Field.Text
                  name={`content.criteria.${criterionIndex}.levels.${levelIndex}.description`}
                  label="คำอธิบาย"
                />
                <IconButton
                  color="error"
                  aria-label="ลบระดับ"
                  onClick={() =>
                    updateLevels(
                      criterionIndex,
                      criterion.levels.filter((_, index) => index !== levelIndex)
                    )
                  }
                >
                  <RemixIcon icon="solar:trash-bin-trash-linear" />
                </IconButton>
              </Box>
            ))}
            <RowActions
              index={criterionIndex}
              total={rows.value.length}
              onMove={rows.move}
              onRemove={() => rows.remove(criterionIndex)}
            />
          </Box>
        ))}
      </ObjectList>
    </Box>
  );
}

export function TemplateContentFields({ templateType }: { templateType: TemplateType }) {
  if (templateType === 'learning_objective')
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Field.Text
          required
          multiline
          minRows={3}
          name="content.description"
          label="ข้อความจุดประสงค์"
        />
        <Field.Select name="content.domain" label="ด้าน K / P / A">
          <MenuItem value="knowledge">K — ความรู้</MenuItem>
          <MenuItem value="process">P — ทักษะ/กระบวนการ</MenuItem>
          <MenuItem value="attitude">A — เจตคติ</MenuItem>
        </Field.Select>
        <Field.Text name="content.behaviorVerb" label="คำกริยาพฤติกรรม" />
        <Field.Text name="content.condition" label="เงื่อนไข" />
        <Field.Text name="content.expectedResult" label="ผลลัพธ์ที่คาดหวัง" />
        <Field.Text name="content.successCriteria" label="เกณฑ์ความสำเร็จ" />
      </Box>
    );
  if (templateType === 'essential_content')
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Field.Text
          required
          multiline
          minRows={6}
          name="content.content"
          label="ข้อความสาระสำคัญ"
        />
        <StringListField name="content.keyConcepts" label="แนวคิดสำคัญ" />
      </Box>
    );
  if (templateType === 'learning_content') return <TopicsFields />;
  if (templateType === 'learning_activity')
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Field.Text required name="content.activityName" label="ชื่อกิจกรรม" />
        <Field.Text name="content.teachingMethod" label="รูปแบบหรือเทคนิคการสอน" />
        <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Field.Select name="content.phase" label="ขั้นของกิจกรรม">
            {['introduction', 'learning', 'practice', 'conclusion'].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Field.Select>
          <Field.Text type="number" name="content.durationMinutes" label="ระยะเวลา (นาที)" />
        </Box>
        <Field.Select name="content.groupType" label="รูปแบบการทำงาน">
          {['individual', 'pair', 'group', 'whole_class'].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Field.Select>
        {[
          ['objectives', 'จุดประสงค์ของกิจกรรม'],
          ['teacherActions', 'สิ่งที่ครูทำ'],
          ['studentActions', 'สิ่งที่นักเรียนทำ'],
          ['requiredMaterials', 'วัสดุหรือสื่อ'],
          ['expectedOutputs', 'ผลงานที่คาดหวัง'],
        ].map(([name, label]) => (
          <StringListField key={name} name={`content.${name}`} label={label} />
        ))}
      </Box>
    );
  if (templateType === 'assessment')
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Field.Select name="content.assessmentType" label="ประเภทการประเมิน">
          {[
            'test',
            'worksheet',
            'observation',
            'performance',
            'project',
            'presentation',
            'interview',
            'portfolio',
          ].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Field.Select>
        {[
          ['method', 'วิธีการประเมิน'],
          ['instrument', 'เครื่องมือ'],
          ['evidence', 'หลักฐาน'],
          ['criteria', 'เกณฑ์'],
        ].map(([name, label]) => (
          <Field.Text key={name} required multiline name={`content.${name}`} label={label} />
        ))}
        <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Field.Text type="number" name="content.maximumScore" label="คะแนนเต็ม" />
          <Field.Text type="number" name="content.passingScore" label="คะแนนผ่าน" />
        </Box>
      </Box>
    );
  if (templateType === 'rubric') return <RubricFields />;
  if (templateType === 'media')
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Field.Select name="content.mediaType" label="ประเภทสื่อ">
          {[
            'worksheet',
            'slide',
            'video',
            'website',
            'book',
            'game',
            'quiz',
            'equipment',
            'other',
          ].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Text required name="content.title" label="ชื่อสื่อ" />
        <Field.Text multiline name="content.description" label="คำอธิบาย" />
        <Field.Text name="content.url" label="URL" />
        <Field.Text name="content.marketplaceProductId" label="Marketplace Product ID" />
        <Field.Text multiline name="content.usageInstructions" label="วิธีใช้" />
      </Box>
    );
  if (templateType === 'question') return <QuestionsFields />;
  if (templateType === 'reflection') return <ReflectionFields />;
  return <LessonPlanSectionsFields />;
}
