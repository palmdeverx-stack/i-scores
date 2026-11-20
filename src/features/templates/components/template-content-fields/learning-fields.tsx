'use client';

import type { DropResult } from '@hello-pangea/dnd';
import type { TemplateOption, LearningObjectiveItem, LearningObjectiveContent } from '../../types';

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, contentName, useArrayValue } from './helpers';
import { ObjectList, RowActions, TemplateSourcePicker } from './common-fields';

export function TopicsFields({ contentPath }: { contentPath: string }) {
  const rows = useArrayValue<{ id: string; title: string; description?: string; order: number }>(
    contentName(contentPath, 'topics')
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
            name={contentName(contentPath, `topics.${index}.title`)}
            label={`หัวข้อที่ ${index + 1}`}
          />
          <Field.Text
            multiline
            minRows={2}
            name={contentName(contentPath, `topics.${index}.description`)}
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

export function LearningObjectivesFields({
  contentPath,
  templateOptions,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
}) {
  const objectivesPath = contentName(contentPath, 'objectives');
  const rows = useArrayValue<LearningObjectiveItem>(objectivesPath);
  const { getValues, setValue } = useFormContext();
  useEffect(() => {
    if (rows.value.length) return;
    const legacy = (getValues(contentPath) ?? {}) as Partial<LearningObjectiveItem>;
    setValue(
      objectivesPath,
      [
        {
          id: legacy.id ?? uid(),
          description: legacy.description ?? '',
          domain: legacy.domain ?? 'knowledge',
          behaviorVerb: legacy.behaviorVerb ?? '',
          condition: legacy.condition ?? '',
          expectedResult: legacy.expectedResult ?? '',
          successCriteria: legacy.successCriteria ?? '',
        },
      ],
      { shouldDirty: Boolean(legacy.description), shouldValidate: false }
    );
  }, [contentPath, getValues, objectivesPath, rows.value.length, setValue]);

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    rows.move(source.index, destination.index);
  };

  const addFromTemplate = (template: TemplateOption) => {
    const content = template.content as LearningObjectiveContent;
    const templateObjectives = content.objectives?.length
      ? content.objectives
      : [
          {
            id: uid(),
            description: content.description ?? '',
            domain: content.domain ?? 'knowledge',
            behaviorVerb: content.behaviorVerb ?? '',
            condition: content.condition ?? '',
            expectedResult: content.expectedResult ?? '',
            successCriteria: content.successCriteria ?? '',
          } satisfies LearningObjectiveItem,
        ];

    rows.update([
      ...rows.value,
      ...templateObjectives.map((objective) => ({ ...structuredClone(objective), id: uid() })),
    ]);
  };

  return (
    <ObjectList
      title="รายการจุดประสงค์การเรียนรู้"
      onAdd={() =>
        rows.update([
          ...rows.value,
          {
            id: uid(),
            description: '',
            domain: 'knowledge',
            behaviorVerb: '',
            condition: '',
            expectedResult: '',
            successCriteria: '',
          },
        ])
      }
    >
      <TemplateSourcePicker
        templateType="learning_objective"
        templateOptions={templateOptions}
        label="เลือกจาก Template"
        onApply={addFromTemplate}
      />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`learning-objectives-${contentPath}`}>
          {(droppableProvided) => (
            <Box
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              sx={{ gap: 1.5, display: 'grid' }}
            >
              {rows.value.map((row, index) => (
                <Draggable key={row.id} draggableId={row.id} index={index}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        p: 1.5,
                        gap: 1.25,
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
                          component="span"
                          role="button"
                          aria-label={`ลากเพื่อเรียงจุดประสงค์ข้อที่ ${index + 1}`}
                          sx={{
                            p: 0.5,
                            display: 'grid',
                            cursor: 'grab',
                            color: 'text.secondary',
                            touchAction: 'none',
                            '&:active': { cursor: 'grabbing' },
                          }}
                        >
                          <RemixIcon icon="custom:drag-dots-fill" width={20} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          จุดประสงค์ข้อที่ {index + 1}
                        </Typography>
                        <Field.Select
                          size="small"
                          name={contentName(contentPath, `objectives.${index}.domain`)}
                          aria-label={`ด้านของจุดประสงค์ข้อที่ ${index + 1}`}
                          sx={{ width: { xs: 130, sm: 170 } }}
                        >
                          <MenuItem value="knowledge">K — ความรู้</MenuItem>
                          <MenuItem value="process">P — ทักษะ</MenuItem>
                          <MenuItem value="attitude">A — เจตคติ</MenuItem>
                        </Field.Select>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`ลบจุดประสงค์ข้อที่ ${index + 1}`}
                          onClick={() => rows.remove(index)}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-linear" />
                        </IconButton>
                      </Box>
                      <Box
                        sx={{
                          gap: 2,
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        }}
                      >
                        <Field.Text
                          required
                          size="small"
                          name={contentName(contentPath, `objectives.${index}.behaviorVerb`)}
                          label="คำกริยาพฤติกรรม"
                        />
                        <Field.Text
                          required
                          size="small"
                          name={contentName(contentPath, `objectives.${index}.expectedResult`)}
                          label="ผลลัพธ์ที่คาดหวัง"
                        />
                        <Field.Text
                          size="small"
                          name={contentName(contentPath, `objectives.${index}.condition`)}
                          label="เงื่อนไข (ถ้ามี)"
                        />
                        <Field.Text
                          size="small"
                          name={contentName(contentPath, `objectives.${index}.successCriteria`)}
                          label="เกณฑ์ความสำเร็จ (ถ้ามี)"
                        />
                      </Box>
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
