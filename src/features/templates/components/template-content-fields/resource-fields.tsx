'use client';

import type { DropResult } from '@hello-pangea/dnd';
import type { MediaItem, MediaContent, TemplateOption } from '../../types';

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, contentName, useArrayValue } from './helpers';
import { BLOOM_OPTIONS, MEDIA_TYPE_OPTIONS } from './constants';
import {
  ObjectList,
  RowActions,
  StringListField,
  TemplateSourcePicker,
  TemplateStarterPicker,
} from './common-fields';

export function QuestionsFields({
  contentPath,
  templateOptions,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
}) {
  type QuestionItem = {
    id: string;
    question: string;
    bloomLevel?: string;
    expectedAnswer?: string;
    followUpQuestions?: string[];
  };
  const rows = useArrayValue<QuestionItem>(contentName(contentPath, 'questions'));
  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    rows.move(source.index, destination.index);
  };
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
      <TemplateSourcePicker
        templateType="question"
        templateOptions={templateOptions}
        onApply={(template) => {
          const content = template.content as { questions?: QuestionItem[] };
          rows.update([
            ...rows.value,
            ...(content.questions ?? []).map((item) => ({ ...structuredClone(item), id: uid() })),
          ]);
        }}
      />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`questions-${contentPath}`}>
          {(droppableProvided) => (
            <Box
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              sx={{ gap: 1, display: 'grid' }}
            >
              {rows.value.map((row, index) => (
                <Draggable key={row.id} draggableId={row.id} index={index}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        p: 1.5,
                        gap: 1,
                        display: 'grid',
                        border: '1px solid',
                        borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        boxShadow: snapshot.isDragging ? 8 : 0,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          {...provided.dragHandleProps}
                          sx={{ display: 'grid', cursor: 'grab', color: 'text.secondary' }}
                        >
                          <RemixIcon icon="custom:drag-dots-fill" width={20} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          คำถามข้อที่ {index + 1}
                        </Typography>
                        <Field.Select
                          size="small"
                          name={contentName(contentPath, `questions.${index}.bloomLevel`)}
                          aria-label={`ระดับ Bloom ของคำถามข้อที่ ${index + 1}`}
                          sx={{ width: { xs: 130, sm: 160 } }}
                        >
                          {BLOOM_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Field.Select>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`ลบคำถามข้อที่ ${index + 1}`}
                          onClick={() => rows.remove(index)}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-linear" />
                        </IconButton>
                      </Box>
                      <Field.Text
                        required
                        multiline
                        minRows={2}
                        size="small"
                        name={contentName(contentPath, `questions.${index}.question`)}
                        label="คำถามหลัก"
                      />
                      <Field.Text
                        multiline
                        minRows={2}
                        size="small"
                        name={contentName(contentPath, `questions.${index}.expectedAnswer`)}
                        label="คำตอบที่คาดหวัง"
                      />
                      <StringListField
                        name={contentName(contentPath, `questions.${index}.followUpQuestions`)}
                        label="คำถามต่อยอด"
                      />
                    </Box>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>
    </ObjectList>
  );
}

export function MediaFields({
  contentPath,
  templateOptions,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
}) {
  const itemsPath = contentName(contentPath, 'items');
  const rows = useArrayValue<MediaItem>(itemsPath);
  const { getValues, setValue } = useFormContext();

  useEffect(() => {
    if (rows.value.length) return;
    const legacy = (getValues(contentPath) ?? {}) as MediaContent;
    setValue(
      itemsPath,
      [
        {
          id: uid(),
          mediaType: legacy.mediaType ?? 'worksheet',
          title: legacy.title ?? '',
          description: legacy.description ?? '',
          url: legacy.url ?? '',
          marketplaceProductId: legacy.marketplaceProductId ?? '',
          usageInstructions: legacy.usageInstructions ?? '',
        },
      ],
      { shouldDirty: Boolean(legacy.title), shouldValidate: false }
    );
  }, [contentPath, getValues, itemsPath, rows.value.length, setValue]);

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    rows.move(source.index, destination.index);
  };
  const emptyItem = (): MediaItem => ({
    id: uid(),
    mediaType: 'worksheet',
    title: '',
    description: '',
    url: '',
    marketplaceProductId: '',
    usageInstructions: '',
  });

  return (
    <ObjectList
      title="รายการสื่อและแหล่งเรียนรู้"
      onAdd={() => rows.update([...rows.value, emptyItem()])}
    >
      <TemplateSourcePicker
        templateType="media"
        templateOptions={templateOptions}
        onApply={(template) => {
          const content = template.content as MediaContent;
          const items = content.items?.length
            ? content.items
            : [
                {
                  id: uid(),
                  mediaType: content.mediaType ?? 'worksheet',
                  title: content.title ?? '',
                  description: content.description ?? '',
                  url: content.url ?? '',
                  marketplaceProductId: content.marketplaceProductId ?? '',
                  usageInstructions: content.usageInstructions ?? '',
                } satisfies MediaItem,
              ];
          rows.update([
            ...rows.value,
            ...items.map((item) => ({ ...structuredClone(item), id: uid() })),
          ]);
        }}
      />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`media-${contentPath}`}>
          {(droppableProvided) => (
            <Box
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              sx={{ gap: 1, display: 'grid' }}
            >
              {rows.value.map((row, index) => (
                <Draggable key={row.id} draggableId={row.id} index={index}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        p: 1.5,
                        gap: 1,
                        display: 'grid',
                        border: '1px solid',
                        borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        boxShadow: snapshot.isDragging ? 8 : 0,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          {...provided.dragHandleProps}
                          sx={{ display: 'grid', cursor: 'grab', color: 'text.secondary' }}
                        >
                          <RemixIcon icon="custom:drag-dots-fill" width={20} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          สื่อ/แหล่งเรียนรู้ {index + 1}
                        </Typography>
                        <Field.Select
                          size="small"
                          name={contentName(contentPath, `items.${index}.mediaType`)}
                          aria-label={`ประเภทสื่อรายการที่ ${index + 1}`}
                          sx={{ width: { xs: 130, sm: 170 } }}
                        >
                          {MEDIA_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Field.Select>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`ลบสื่อรายการที่ ${index + 1}`}
                          onClick={() => rows.remove(index)}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-linear" />
                        </IconButton>
                      </Box>
                      <Box
                        sx={{
                          gap: 1,
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        }}
                      >
                        <Field.Text
                          required
                          size="small"
                          name={contentName(contentPath, `items.${index}.title`)}
                          label="ชื่อสื่อหรือแหล่งเรียนรู้"
                        />
                        <Field.Text
                          size="small"
                          name={contentName(contentPath, `items.${index}.url`)}
                          label="URL (ถ้ามี)"
                        />
                      </Box>
                      <Field.Text
                        multiline
                        minRows={2}
                        size="small"
                        name={contentName(contentPath, `items.${index}.description`)}
                        label="คำอธิบาย"
                      />
                      <Field.Text
                        multiline
                        minRows={2}
                        size="small"
                        name={contentName(contentPath, `items.${index}.usageInstructions`)}
                        label="วิธีใช้"
                      />
                    </Box>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>
    </ObjectList>
  );
}

export function ReflectionFields({
  contentPath,
  templateOptions,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
}) {
  const rows = useArrayValue<{
    id: string;
    title: string;
    placeholder?: string;
    required?: boolean;
  }>(contentName(contentPath, 'sections'));
  return (
    <Box sx={{ gap: 3, display: 'grid' }}>
      <TemplateStarterPicker
        templateType="reflection"
        templateOptions={templateOptions}
        contentPath={contentPath}
      />
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Typography variant="subtitle1">ผลการจัดการเรียนรู้</Typography>
        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
          }}
        >
          <Field.Text
            type="number"
            name={contentName(contentPath, 'studentCount')}
            label="จำนวนนักเรียน"
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <Field.Text
            type="number"
            name={contentName(contentPath, 'passedCount')}
            label="ผ่านจุดประสงค์ (คน)"
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <Field.Text
            type="number"
            name={contentName(contentPath, 'passedPercentage')}
            label="ผ่าน (ร้อยละ)"
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
          />
          <Field.Text
            type="number"
            name={contentName(contentPath, 'notPassedCount')}
            label="ไม่ผ่าน (คน)"
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <Field.Text
            type="number"
            name={contentName(contentPath, 'notPassedPercentage')}
            label="ไม่ผ่าน (ร้อยละ)"
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
          />
        </Box>
        <StringListField
          name={contentName(contentPath, 'specialStudents')}
          label="นักเรียนที่มีความสามารถพิเศษ/นักเรียนเด็กพิเศษ"
          addLabel="เพิ่มนักเรียน"
        />
      </Box>
      {[
        ['knowledgeResult', 'ผลการจัดการเรียนรู้ด้านความรู้ (K)'],
        ['processResult', 'ผลการจัดการเรียนรู้ด้านทักษะ/กระบวนการ (P)'],
        ['attitudeResult', 'ผลการจัดการเรียนรู้ด้านคุณลักษณะ (A)'],
        ['problems', 'ปัญหา/อุปสรรค'],
        ['solutions', 'แนวทางแก้ไข/ข้อเสนอแนะ'],
      ].map(([name, label]) => (
        <Box key={name} sx={{ gap: 1, display: 'grid' }}>
          <Typography variant="subtitle2">{label}</Typography>
          <Field.Editor name={contentName(contentPath, name)} placeholder={`ระบุ${label}`} />
        </Box>
      ))}
      <Divider />
      <ObjectList
        title="หัวข้อบันทึกเพิ่มเติม"
        onAdd={() =>
          rows.update([...rows.value, { id: uid(), title: '', placeholder: '', required: false }])
        }
      >
        {rows.value.map((row, index) => (
          <Box key={row.id} sx={{ gap: 1, display: 'grid' }}>
            <Field.Text
              required
              name={contentName(contentPath, `sections.${index}.title`)}
              label={`หัวข้อที่ ${index + 1}`}
            />
            <Field.Text
              multiline
              name={contentName(contentPath, `sections.${index}.placeholder`)}
              label="ข้อความแนะนำ"
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
    </Box>
  );
}
