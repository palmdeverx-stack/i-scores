'use client';

import type { AssessmentContent, LearningObjectiveContent } from '../../types';

import { useEffect } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';

import { contentName } from './helpers';
import { mapObjectivesToAssessmentRows } from '../../assessment-mapping';

export function ObjectiveAssessmentFields({
  contentPath,
  objectiveContent,
}: {
  contentPath: string;
  objectiveContent: LearningObjectiveContent;
}) {
  const { getValues, setValue } = useFormContext();
  const rowsPath = contentName(contentPath, 'rows');
  const watchedRows = useWatch({ name: rowsPath }) as AssessmentContent['rows'];

  useEffect(() => {
    const assessmentContent = (getValues(contentPath) ?? {}) as AssessmentContent;
    const nextRows = mapObjectivesToAssessmentRows(objectiveContent, assessmentContent);
    if (JSON.stringify(watchedRows ?? []) === JSON.stringify(nextRows)) return;
    setValue(rowsPath, nextRows, { shouldDirty: true, shouldValidate: false });
  }, [contentPath, getValues, objectiveContent, rowsPath, setValue, watchedRows]);

  const rows = watchedRows ?? [];
  if (!rows.length)
    return (
      <Alert severity="info">
        เพิ่มรายการในหัวข้อ “จุดประสงค์การเรียนรู้” ก่อน ระบบจึงจะสร้างตารางการประเมินให้
      </Alert>
    );

  return (
    <Box sx={{ gap: 1.5, display: 'grid' }}>
      <Typography variant="body2" color="text.secondary">
        รายการประเมินสร้างจากจุดประสงค์การเรียนรู้โดยอัตโนมัติ
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          sx={{
            minWidth: 900,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              bgcolor: 'background.neutral',
              gridTemplateColumns: '1.15fr 1fr 1fr 1fr',
            }}
          >
            {['รายการประเมิน', 'วิธีการวัดและประเมินผล', 'เครื่องมือการวัด', 'เกณฑ์การประเมิน'].map(
              (label) => (
                <Typography
                  key={label}
                  variant="subtitle2"
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {label}
                </Typography>
              )
            )}
          </Box>
          {rows.map((row, index) => (
            <Box
              key={row.objectiveId}
              sx={{
                display: 'grid',
                alignItems: 'stretch',
                borderTop: '1px solid',
                borderColor: 'divider',
                gridTemplateColumns: '1.15fr 1fr 1fr 1fr',
              }}
            >
              <Typography sx={{ p: 1.5, whiteSpace: 'pre-wrap' }}>
                {index + 1}. {row.issue}
              </Typography>
              {(
                [
                  ['method', 'วิธีการวัดและประเมินผล'],
                  ['instrument', 'เครื่องมือการวัด'],
                  ['criteria', 'เกณฑ์การประเมิน'],
                ] as const
              ).map(([field, label]) => (
                <Box key={field} sx={{ p: 1, borderLeft: '1px solid', borderColor: 'divider' }}>
                  <Field.Text
                    multiline
                    minRows={3}
                    name={`${rowsPath}.${index}.${field}`}
                    label={label}
                  />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
