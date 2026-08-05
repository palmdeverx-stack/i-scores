'use client';

import type { DropResult } from '@hello-pangea/dnd';
import type { TemplateType, TemplateOption, EvaluationStudent } from '../../types';

import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, useArrayValue } from './helpers';
import { TEMPLATE_TYPE_LABELS } from '../../constants';

export function ObjectList({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ gap: 1.5, display: 'grid' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1">{title}</Typography>
        {onAdd ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<RemixIcon icon="mingcute:add-line" />}
            onClick={onAdd}
          >
            เพิ่มรายการ
          </Button>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

export function RowActions({
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

export function TemplateSourcePicker({
  templateType,
  templateOptions,
  onApply,
  actionLabel = 'นำมาเพิ่ม',
}: {
  templateType: TemplateType;
  templateOptions: TemplateOption[];
  onApply: (template: TemplateOption) => void;
  actionLabel?: string;
}) {
  const [selectedId, setSelectedId] = useState('');
  const options = useMemo(
    () => templateOptions.filter((template) => template.template_type === templateType),
    [templateOptions, templateType]
  );

  if (!options.length) return null;

  return (
    <Box
      sx={{
        gap: 1,
        p: 1.25,
        display: 'flex',
        alignItems: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
      }}
    >
      <TextField
        select
        fullWidth
        size="small"
        label={`เลือก Template ${TEMPLATE_TYPE_LABELS[templateType]}`}
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
      >
        {options.map((template) => (
          <MenuItem key={template.id} value={template.id}>
            {template.name}
          </MenuItem>
        ))}
      </TextField>
      <Button
        size="small"
        variant="contained"
        disabled={!selectedId}
        startIcon={<RemixIcon icon="mingcute:add-line" />}
        onClick={() => {
          const selected = options.find((template) => template.id === selectedId);
          if (!selected) return;
          onApply(selected);
          setSelectedId('');
        }}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {actionLabel}
      </Button>
    </Box>
  );
}

export function TemplateStarterPicker({
  templateType,
  templateOptions,
  contentPath,
}: {
  templateType: TemplateType;
  templateOptions: TemplateOption[];
  contentPath: string;
}) {
  const { setValue } = useFormContext();
  return (
    <TemplateSourcePicker
      templateType={templateType}
      templateOptions={templateOptions}
      actionLabel="ใช้เป็นข้อมูลตั้งต้น"
      onApply={(template) =>
        setValue(contentPath, structuredClone(template.content), {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    />
  );
}

export function SharedEvaluationStudentFields({ fieldPath }: { fieldPath: string }) {
  const students = useArrayValue<EvaluationStudent>(fieldPath);
  return (
    <Box sx={{ gap: 1.5, display: 'grid' }}>
      <Alert severity="info">
        รายชื่อนี้ใช้ร่วมกันในเอกสารประเมินเพิ่มเติมทุกประเภท แก้ไขครั้งเดียวทุกหน้าจะอัปเดตตาม
      </Alert>
      <ObjectList
        title="รายชื่อนักเรียนชุดกลาง"
        onAdd={() => students.update([...students.value, { id: uid(), name: '' }])}
      >
        <Box sx={{ gap: 1, display: 'grid' }}>
          {students.value.map((student, index) => (
            <Box key={student.id} sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ width: 28 }}>
                {index + 1}.
              </Typography>
              <Field.Text
                size="small"
                name={`${fieldPath}.${index}.name`}
                label="ชื่อ-สกุล"
                sx={{ flex: 1 }}
              />
              <IconButton
                color="error"
                disabled={students.value.length <= 1}
                onClick={() => students.remove(index)}
                aria-label={`ลบนักเรียนคนที่ ${index + 1}`}
              >
                <RemixIcon icon="solar:trash-bin-trash-linear" />
              </IconButton>
            </Box>
          ))}
        </Box>
      </ObjectList>
    </Box>
  );
}

export function StringListField({
  name,
  label,
  addLabel,
}: {
  name: string;
  label: string;
  addLabel?: string;
}) {
  const rows = useArrayValue<string>(name);
  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    rows.move(source.index, destination.index);
  };
  return (
    <Box sx={{ gap: 2, display: 'grid' }}>
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
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`string-list-${name}`}>
          {(droppableProvided) => (
            <Box ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              {rows.value.map((_, index) => (
                <Draggable key={`${name}-${index}`} draggableId={`${name}-${index}`} index={index}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        gap: 0.5,
                        mb: 2,
                        display: 'grid',
                        alignItems: 'center',
                        gridTemplateColumns: '28px minmax(0, 1fr) 36px',
                        opacity: snapshot.isDragging ? 0.9 : 1,
                      }}
                    >
                      <Box
                        {...provided.dragHandleProps}
                        sx={{ display: 'grid', cursor: 'grab', color: 'text.secondary' }}
                      >
                        <RemixIcon icon="custom:drag-dots-fill" width={20} />
                      </Box>
                      <Field.Text
                        size="small"
                        name={`${name}.${index}`}
                        label={`${label} ${index + 1}`}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`ลบ${label} ${index + 1}`}
                        onClick={() => rows.remove(index)}
                      >
                        <RemixIcon icon="solar:trash-bin-trash-linear" />
                      </IconButton>
                    </Box>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>
    </Box>
  );
}
