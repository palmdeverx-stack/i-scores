import type { LessonPlanFormValues } from '../lesson-plan-form.schema';

import { memo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

type MediaTabProps = {
  isEditable: boolean;
};

export const MediaTab = memo(function MediaTab({ isEditable }: MediaTabProps) {
  const { control } = useFormContext<LessonPlanFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'learningMedia' });

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
          onClick={() => append({ content: '' })}
        >
          เพิ่มสื่อ
        </Button>
      </Box>

      {fields.length ? (
        <Box sx={{ gap: 1.25, display: 'grid' }}>
          {fields.map((media, index) => (
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
                onClick={() => remove(index)}
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
  );
});
