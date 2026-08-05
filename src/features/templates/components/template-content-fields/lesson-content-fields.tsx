'use client';

import type { TemplateOption, StructuredListContent } from '../../types';

import { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, contentName, useArrayValue } from './helpers';
import { ObjectList, TemplateSourcePicker } from './common-fields';
import { StructuredRowsField, normalizeStructuredItems } from './structured-list-fields';

export function LearningStandardFields({
  contentPath,
  templateOptions,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
}) {
  const itemsField = contentName(contentPath, 'items');
  const milestoneField = contentName(contentPath, 'milestoneIndicators');
  const terminalField = contentName(contentPath, 'terminalIndicators');
  const itemsRows = useArrayValue<StructuredListContent['items'][number]>(itemsField);
  const milestoneRows = useArrayValue<StructuredListContent['items'][number]>(milestoneField);
  const terminalRows = useArrayValue<StructuredListContent['items'][number]>(terminalField);
  const newRow = () => ({ id: uid(), code: '', title: '', description: '' });

  return (
    <Box sx={{ gap: 3, display: 'grid' }}>
      <ObjectList
        title="มาตรฐานการเรียนรู้"
        onAdd={() => itemsRows.update([...itemsRows.value, newRow()])}
      >
        <TemplateSourcePicker
          templateType="learning_standard"
          templateOptions={templateOptions}
          onApply={(template) => {
            itemsRows.update([
              ...itemsRows.value,
              ...normalizeStructuredItems(template.content).map((item) => ({
                ...item,
                id: uid(),
              })),
            ]);
          }}
        />
        <StructuredRowsField
          fieldName={itemsField}
          itemLabel="มาตรฐาน/ตัวชี้วัด"
          showCode
          showDescription={false}
        />
      </ObjectList>
      <Divider />
      <ObjectList
        title="ตัวชี้วัดระหว่างทาง"
        onAdd={() => milestoneRows.update([...milestoneRows.value, newRow()])}
      >
        <StructuredRowsField
          fieldName={milestoneField}
          itemLabel="ตัวชี้วัดระหว่างทาง"
          showCode
          showDescription={false}
        />
      </ObjectList>
      <Divider />
      <ObjectList
        title="ตัวชี้วัดปลายทาง"
        onAdd={() => terminalRows.update([...terminalRows.value, newRow()])}
      >
        <StructuredRowsField
          fieldName={terminalField}
          itemLabel="ตัวชี้วัดปลายทาง"
          showCode
          showDescription={false}
        />
      </ObjectList>
    </Box>
  );
}

function legacyActivityRow(content: unknown): StructuredListContent['items'][number] | null {
  const value = (content ?? {}) as Record<string, unknown>;
  if (Array.isArray(value.items)) return null;
  const title = typeof value.activityName === 'string' ? value.activityName : '';
  const lines = [
    ...((value.teacherActions as string[] | undefined) ?? []),
    ...((value.studentActions as string[] | undefined) ?? []),
  ].filter(Boolean);
  if (!title && !lines.length) return null;

  return {
    id: uid(),
    title,
    description: lines.map((line) => `<p>${line}</p>`).join(''),
  };
}

export function ActivityListFields({ contentPath }: { contentPath: string }) {
  const fieldName = contentName(contentPath, 'items');
  const rows = useArrayValue<StructuredListContent['items'][number]>(fieldName);
  const { control, getValues } = useFormContext();
  const { replace } = useFieldArray({ control, name: fieldName, keyName: 'rhfKey' });

  useEffect(() => {
    const currentContent = getValues(contentPath);
    const currentItems = (currentContent as Record<string, unknown> | undefined)?.items;
    if (Array.isArray(currentItems)) return;
    const legacyRow = legacyActivityRow(currentContent);
    if (!legacyRow) return;
    replace([legacyRow]);
  }, [contentPath, getValues, replace]);

  return (
    <ObjectList
      title="กิจกรรมการเรียนรู้"
      onAdd={() => rows.update([...rows.value, { id: uid(), title: '', description: '' }])}
    >
      <Box sx={{ gap: 2, display: 'grid' }}>
        {rows.value.map((row, index) => (
          <Box
            key={row.id}
            sx={{
              p: 1.5,
              gap: 1.25,
              display: 'grid',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                กิจกรรมที่ {index + 1}
              </Typography>
              <IconButton
                size="small"
                color="error"
                aria-label={`ลบกิจกรรมที่ ${index + 1}`}
                onClick={() => rows.remove(index)}
              >
                <RemixIcon icon="solar:trash-bin-trash-linear" />
              </IconButton>
            </Box>
            <Field.Text required size="small" name={`${fieldName}.${index}.title`} label="หัวข้อ" />
            <Field.Editor
              name={`${fieldName}.${index}.description`}
              placeholder="รายละเอียดกิจกรรม"
            />
          </Box>
        ))}
      </Box>
    </ObjectList>
  );
}
