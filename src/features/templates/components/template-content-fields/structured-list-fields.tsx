'use client';

import type { DropResult } from '@hello-pangea/dnd';
import type { TemplateType, TemplateOption, StructuredListContent } from '../../types';

import { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Droppable, Draggable, DragDropContext } from '@hello-pangea/dnd';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { STRUCTURED_LIST_CONFIG } from './constants';
import { uid, contentName, useArrayValue } from './helpers';
import { ObjectList, TemplateSourcePicker } from './common-fields';

export function normalizeStructuredItems(content: unknown): StructuredListContent['items'] {
  const value = (content ?? {}) as Record<string, unknown>;
  const source = Array.isArray(content)
    ? content
    : (value.items ??
      value.standards ??
      value.competencies ??
      value.characteristics ??
      value.desiredCharacteristics ??
      value.desired_characteristics ??
      value.values ??
      value.list ??
      []);
  const structuredSource = Array.isArray(source) ? source : [];
  const normalizedSource = structuredSource.length
    ? structuredSource
    : [source, value.content, value.text, value.description]
        .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        .flatMap((item) =>
          item
            .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replaceAll('&nbsp;', ' ')
            .replaceAll('&amp;', '&')
            .split('\n')
            .map((line) => line.replace(/^\s*(?:[-•]|ข้อ\s*\d+\.?|\d+[.)])\s*/, '').trim())
            .filter(Boolean)
        );

  const normalized = normalizedSource.map((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      return { id: uid(), code: '', title: String(item), description: '' };
    }
    const row = (item ?? {}) as Record<string, unknown>;
    const code = String(row.code ?? '');
    const rawTitle = String(row.title ?? row.name ?? '');
    const rawDescription = String(row.description ?? row.detail ?? '');
    return {
      id: typeof row.id === 'string' && row.id ? row.id : uid(),
      code,
      title: rawTitle || rawDescription || code,
      description: rawTitle ? rawDescription : '',
    };
  });
  const meaningful = normalized.filter(
    (item) =>
      Boolean(item.code.trim()) || Boolean(item.title.trim()) || Boolean(item.description.trim())
  );
  return meaningful.length ? meaningful : normalized.slice(0, 1);
}

export function StructuredRowsField({
  fieldName,
  itemLabel,
  showCode = true,
  showDescription = true,
  compact = false,
}: {
  fieldName: string;
  itemLabel: string;
  showCode?: boolean;
  showDescription?: boolean;
  compact?: boolean;
}) {
  const rows = useArrayValue<StructuredListContent['items'][number]>(fieldName);
  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    rows.move(source.index, destination.index);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={`structured-rows-${fieldName}`}>
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
                      p: compact ? 1 : 1.5,
                      gap: compact ? 0.75 : 1,
                      display: 'grid',
                      alignItems: compact ? 'center' : undefined,
                      gridTemplateColumns: compact ? '28px 28px minmax(0, 1fr) 36px' : undefined,

                      bgcolor: 'background.paper',
                      boxShadow: snapshot.isDragging ? 8 : 0,
                    }}
                  >
                    {compact ? (
                      <>
                        <Box
                          {...provided.dragHandleProps}
                          aria-label={`ลากเพื่อเรียง${itemLabel} ${index + 1}`}
                          sx={{
                            display: 'grid',
                            cursor: 'grab',
                            color: 'text.secondary',
                            touchAction: 'none',
                          }}
                        >
                          <RemixIcon icon="custom:drag-dots-fill" width={20} />
                        </Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          {index + 1}.
                        </Typography>
                        <Field.Text
                          required
                          size="small"
                          name={`${fieldName}.${index}.title`}
                          label={`ชื่อ${itemLabel}`}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`ลบ${itemLabel} ${index + 1}`}
                          onClick={() => rows.remove(index)}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-linear" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            {...provided.dragHandleProps}
                            sx={{ display: 'grid', cursor: 'grab', color: 'text.secondary' }}
                          >
                            <RemixIcon icon="custom:drag-dots-fill" width={20} />
                          </Box>
                          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                            {itemLabel} {index + 1}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`ลบ${itemLabel} ${index + 1}`}
                            onClick={() => rows.remove(index)}
                          >
                            <RemixIcon icon="solar:trash-bin-trash-linear" />
                          </IconButton>
                        </Box>
                        <Box
                          sx={{
                            gap: 1,
                            display: 'grid',
                            gridTemplateColumns: showCode
                              ? { xs: '1fr', sm: '180px minmax(0, 1fr)' }
                              : '1fr',
                          }}
                        >
                          {showCode ? (
                            <Field.Text
                              size="small"
                              name={`${fieldName}.${index}.code`}
                              label={`รหัส${itemLabel}`}
                            />
                          ) : null}
                          <Field.Text
                            required
                            size="small"
                            name={`${fieldName}.${index}.title`}
                            label={`ชื่อ${itemLabel}`}
                          />
                        </Box>
                        {showDescription ? (
                          <Field.Text
                            multiline
                            minRows={2}
                            size="small"
                            name={`${fieldName}.${index}.description`}
                            label="รายละเอียด"
                          />
                        ) : null}
                      </>
                    )}
                  </Box>
                )}
              </Draggable>
            ))}
            {droppableProvided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export function StructuredListFields({
  templateType,
  contentPath,
  templateOptions,
}: {
  templateType: TemplateType;
  contentPath: string;
  templateOptions: TemplateOption[];
}) {
  const config = STRUCTURED_LIST_CONFIG[templateType]!;
  const fieldName = contentName(contentPath, 'items');
  const rows = useArrayValue<StructuredListContent['items'][number]>(fieldName);
  const { control, getValues } = useFormContext();
  const { replace } = useFieldArray({ control, name: fieldName, keyName: 'rhfKey' });

  useEffect(() => {
    const currentContent = getValues(contentPath);
    const currentItems = (currentContent as Record<string, unknown> | undefined)?.items;
    const normalized = normalizeStructuredItems(currentContent);
    if (!normalized.length) return;
    if (JSON.stringify(currentItems) === JSON.stringify(normalized)) return;
    replace(normalized);
  }, [contentPath, getValues, replace]);

  return (
    <ObjectList
      title={config.title}
      onAdd={() =>
        rows.update([...rows.value, { id: uid(), code: '', title: '', description: '' }])
      }
    >
      <TemplateSourcePicker
        templateType={templateType}
        templateOptions={templateOptions}
        onApply={(template) => {
          const currentItems = rows.value.filter(
            (item) =>
              Boolean(item.code?.trim()) ||
              Boolean(item.title?.trim()) ||
              Boolean(item.description?.trim())
          );
          const importedItems = normalizeStructuredItems(template.content).map((item) => ({
            ...item,
            id: uid(),
            code: item.code ?? '',
            title: item.title ?? '',
            description: item.description ?? '',
          }));
          replace([...currentItems, ...importedItems]);
        }}
      />
      <StructuredRowsField
        fieldName={fieldName}
        itemLabel={config.itemLabel}
        showCode={config.showCode}
        showDescription={config.showDescription}
        compact={config.compact}
      />
    </ObjectList>
  );
}
