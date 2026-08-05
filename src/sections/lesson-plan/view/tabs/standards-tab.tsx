import type { Control } from 'react-hook-form';
import type { LessonPlanAssignment } from '../../lesson-plan-actions';
import type { LessonPlanFormValues } from '../lesson-plan-form.schema';

import { memo } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

function DynamicCurriculumField({
  label,
  addLabel,
  required,
  disabled,
  control,
}: {
  label: string;
  addLabel: string;
  required?: boolean;
  disabled: boolean;
  control: Control<LessonPlanFormValues>;
}) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'learningStandards',
  });

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1.25, fontWeight: 700 }}>
        {label}
        {required ? ' *' : ''}
      </Typography>
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        {fields.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              gap: 1,
              p: 1.5,
              display: 'grid',
              borderRadius: 1.5,
              gridTemplateColumns: '32px minmax(0, 1fr) 36px',
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                borderRadius: '50%',
                placeItems: 'center',
                color: 'primary.main',
                bgcolor: 'primary.lighter',
                typography: 'subtitle2',
              }}
            >
              {index + 1}
            </Box>
            <Field.Text
              required={required}
              multiline
              minRows={2}
              disabled={disabled}
              name={`learningStandards.${index}.content`}
              placeholder={`กรอก${label}`}
              slotProps={{ htmlInput: { 'aria-label': `${label} รายการที่ ${index + 1}` } }}
            />
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              aria-label={`ลบ${label} รายการที่ ${index + 1}`}
              onClick={() => (fields.length === 1 ? update(0, { content: '' }) : remove(index))}
            >
              <RemixIcon icon="solar:trash-bin-trash-linear" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button
        size="small"
        disabled={disabled}
        startIcon={<RemixIcon icon="mingcute:add-line" />}
        onClick={() => append({ content: '' })}
        sx={{ mt: 1 }}
      >
        {addLabel}
      </Button>
    </Box>
  );
}

function DynamicIndicatorsField({
  name,
  label,
  addLabel,
  disabled,
  control,
}: {
  name: 'milestoneIndicators' | 'terminalIndicators';
  label: string;
  addLabel: string;
  disabled: boolean;
  control: Control<LessonPlanFormValues>;
}) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name,
  });

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1.25, fontWeight: 700 }}>
        {label}
      </Typography>
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        {fields.map((row, index) => (
          <Box
            key={row.id}
            sx={{
              gap: 1,
              p: 1.5,
              display: 'grid',
              alignItems: 'flex-start',
              borderRadius: 1.5,
              gridTemplateColumns: '32px minmax(0, 1fr) 36px',
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                borderRadius: '50%',
                placeItems: 'center',
                color: 'primary.main',
                bgcolor: 'primary.lighter',
                typography: 'subtitle2',
              }}
            >
              {index + 1}
            </Box>
            <Box
              sx={{
                gap: 1.25,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr)' },
              }}
            >
              <Field.Text
                required
                disabled={disabled}
                name={`${name}.${index}.code`}
                label="รหัสตัวชี้วัด"
                placeholder="เช่น ว 1.2 ป.3/1"
              />
              <Field.Text
                required
                multiline
                minRows={2}
                disabled={disabled}
                name={`${name}.${index}.description`}
                label="ตัวชี้วัด"
                placeholder="ระบุพฤติกรรมหรือผลลัพธ์ที่ต้องการวัด"
              />
            </Box>
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              aria-label={`ลบ${label}รายการที่ ${index + 1}`}
              onClick={() =>
                fields.length === 1 ? update(0, { code: '', description: '' }) : remove(index)
              }
            >
              <RemixIcon icon="solar:trash-bin-trash-linear" />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Button
        size="small"
        disabled={disabled}
        startIcon={<RemixIcon icon="mingcute:add-line" />}
        onClick={() => append({ code: '', description: '' })}
        sx={{ mt: 1 }}
      >
        {addLabel}
      </Button>
    </Box>
  );
}

type StandardsTabProps = {
  isEditable: boolean;
  selectedAssignment: LessonPlanAssignment | undefined;
  selectedIndicatorIds: string[];
  onSelectIndicators: (indicatorIds: string[]) => void;
  onApplyCurriculum: () => void;
};

export const StandardsTab = memo(function StandardsTab({
  isEditable,
  selectedAssignment,
  selectedIndicatorIds,
  onSelectIndicators,
  onApplyCurriculum,
}: StandardsTabProps) {
  const { control } = useFormContext<LessonPlanFormValues>();
  const subject = selectedAssignment?.subject;

  return (
    <Card variant="outlined" sx={{ gap: 2.5, p: { xs: 2.5, sm: 3.5 }, display: 'grid' }}>
      <Box
        sx={{
          gap: 1.5,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography variant="h6">1. มาตรฐานการเรียนรู้ / ตัวชี้วัด / ผลการเรียนรู้</Typography>
          {subject ? (
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              เชื่อมกับหลักสูตร {subject.code ? `${subject.code} · ` : ''}
              {subject.name}
            </Typography>
          ) : null}
        </Box>
        <Button
          size="small"
          color="inherit"
          variant="outlined"
          disabled={!isEditable || !subject}
          startIcon={<RemixIcon icon="solar:refresh-linear" />}
          onClick={onApplyCurriculum}
        >
          ดึงข้อมูลล่าสุด
        </Button>
      </Box>
      {subject?.curriculum_indicators.length ? (
        <Controller
          name="indicatorIds"
          control={control}
          render={({ fieldState }) => (
            <Autocomplete
              multiple
              disabled={!isEditable}
              options={subject.curriculum_indicators}
              value={subject.curriculum_indicators.filter((indicator) =>
                selectedIndicatorIds.includes(indicator.id)
              )}
              getOptionLabel={(option) => `${option.code} · ${option.description}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, value) => {
                onSelectIndicators(value.map((indicator) => indicator.id));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="ตัวชี้วัดจากคลังรายวิชา"
                  error={Boolean(fieldState.error)}
                  helperText={
                    fieldState.error?.message ?? 'เลือกจาก object เดียวกับหน้า Template และหน้ารายวิชา'
                  }
                />
              )}
            />
          )}
        />
      ) : (
        <Alert severity="info">รายวิชานี้ยังไม่มีตัวชี้วัดแบบโครงสร้าง จึงใช้ข้อมูลข้อความเดิมได้ชั่วคราว</Alert>
      )}
      {subject?.learning_outcomes_structured.length ? (
        <Controller
          name="learningOutcomeIds"
          control={control}
          render={({ field }) => (
            <Autocomplete
              multiple
              disabled={!isEditable}
              options={subject.learning_outcomes_structured}
              value={subject.learning_outcomes_structured.filter((item) =>
                field.value.includes(item.id)
              )}
              getOptionLabel={(option) =>
                `${option.code ? `${option.code} · ` : ''}${option.description}`
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, value) => field.onChange(value.map((item) => item.id))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ผลลัพธ์การเรียนรู้รายวิชาที่ใช้ในแผน"
                  helperText="เป็น reference จากรายวิชา ไม่ถูกนำไปเขียนทับจุดประสงค์ของแผน"
                />
              )}
            />
          )}
        />
      ) : null}
      <DynamicCurriculumField
        label="มาตรฐานการเรียนรู้"
        addLabel="เพิ่มมาตรฐานการเรียนรู้"
        disabled={!isEditable || Boolean(subject?.curriculum_indicators.length)}
        control={control}
      />
      <Divider />
      <DynamicIndicatorsField
        name="milestoneIndicators"
        label="ตัวชี้วัดระหว่างทาง"
        addLabel="เพิ่มตัวชี้วัดระหว่างทาง"
        disabled={!isEditable || Boolean(subject?.curriculum_indicators.length)}
        control={control}
      />
      <Divider />
      <DynamicIndicatorsField
        name="terminalIndicators"
        label="ตัวชี้วัดปลายทาง"
        addLabel="เพิ่มตัวชี้วัดปลายทาง"
        disabled={!isEditable}
        control={control}
      />
    </Card>
  );
});
