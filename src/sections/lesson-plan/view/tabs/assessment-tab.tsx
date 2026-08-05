import type { LessonPlanFormValues } from '../lesson-plan-form.schema';

import { memo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

type AssessmentTabProps = {
  isEditable: boolean;
};

export const AssessmentTab = memo(function AssessmentTab({ isEditable }: AssessmentTabProps) {
  const { control } = useFormContext<LessonPlanFormValues>();
  const { fields } = useFieldArray({ control, name: 'assessment' });

  return (
    <Card variant="outlined" sx={{ gap: 2, p: { xs: 2.5, sm: 3.5 }, display: 'grid' }}>
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

      {fields.length ? (
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
            {['ประเด็นการประเมิน', 'วิธีการประเมิน', 'เครื่องมือการประเมิน', 'เกณฑ์การประเมิน'].map(
              (label) => (
                <Typography key={label} variant="subtitle2" sx={{ textAlign: 'center' }}>
                  {label}
                </Typography>
              )
            )}
          </Box>

          <Box sx={{ gap: 1.25, display: 'grid' }}>
            {fields.map((row, index) => (
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
                <Typography variant="subtitle2" sx={{ pt: { sm: 2 }, textAlign: 'center' }}>
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
        <Alert severity="warning">กรุณากรอกจุดประสงค์การเรียนรู้ก่อนกำหนดการวัดและประเมินผล</Alert>
      )}
    </Card>
  );
});
