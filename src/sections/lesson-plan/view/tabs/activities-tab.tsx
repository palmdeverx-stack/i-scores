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

type ActivitiesTabProps = {
  isEditable: boolean;
};

export const ActivitiesTab = memo(function ActivitiesTab({ isEditable }: ActivitiesTabProps) {
  const { control } = useFormContext<LessonPlanFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'learningActivities' });

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
          <Typography variant="h6">7. กิจกรรมการเรียนรู้ *</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            เพิ่มกิจกรรมทีละรายการ พร้อมระบุหัวข้อและรายละเอียดของแต่ละกิจกรรม
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          disabled={!isEditable}
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          onClick={() => append({ title: '', description: '' })}
        >
          เพิ่มกิจกรรม
        </Button>
      </Box>

      {fields.length ? (
        <Box sx={{ gap: 2, display: 'grid' }}>
          {fields.map((field, index) => (
            <Box
              key={field.id}
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
                  color="error"
                  size="small"
                  disabled={!isEditable}
                  aria-label={`ลบกิจกรรมที่ ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <RemixIcon icon="solar:trash-bin-trash-linear" />
                </IconButton>
              </Box>
              <Field.Text
                required
                disabled={!isEditable}
                name={`learningActivities.${index}.title`}
                label="หัวข้อ"
                placeholder="เช่น ขั้นนำเข้าสู่บทเรียน"
              />
              <Field.Editor
                name={`learningActivities.${index}.description`}
                editable={isEditable}
                placeholder="ระบุรายละเอียดกิจกรรม"
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Alert severity="info">กด “เพิ่มกิจกรรม” เพื่อเพิ่มกิจกรรมการเรียนรู้</Alert>
      )}
    </Card>
  );
});
