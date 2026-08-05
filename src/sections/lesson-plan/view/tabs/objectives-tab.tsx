import type { Control } from 'react-hook-form';
import type { LessonPlanFormValues } from '../lesson-plan-form.schema';

import { memo } from 'react';
import { useWatch, useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

function ObjectiveGroupFields({
  control,
  disabled,
  categoryIndex,
  onRemove,
}: {
  control: Control<LessonPlanFormValues>;
  disabled: boolean;
  categoryIndex: number;
  onRemove: () => void;
}) {
  const groupLabel = useWatch({
    control,
    name: `learningObjectives.${categoryIndex}.label`,
  });
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: `learningObjectives.${categoryIndex}.items`,
  });
  const groupName = groupLabel || `ด้านที่ ${categoryIndex + 1}`;

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.paper',
      }}
    >
      {categoryIndex ? <Divider sx={{ mb: 2.5 }} /> : null}
      <Box
        sx={{
          gap: 1,
          mb: 2,
          display: 'grid',
          alignItems: 'center',
          gridTemplateColumns: { xs: '1fr 80px', sm: 'minmax(0, 1fr) 120px 36px' },
        }}
      >
        <Field.Text
          required
          size="small"
          label="ชื่อด้าน"
          disabled={disabled}
          name={`learningObjectives.${categoryIndex}.label`}
          placeholder="เช่น ด้านความรู้ความเข้าใจ"
        />
        <Field.Text
          size="small"
          label="รหัส"
          disabled={disabled}
          name={`learningObjectives.${categoryIndex}.code`}
          placeholder="เช่น K"
        />
        <IconButton
          color="error"
          size="small"
          disabled={disabled}
          aria-label={`ลบ${groupName}`}
          sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: 'end' }}
          onClick={onRemove}
        >
          <RemixIcon icon="solar:trash-bin-trash-linear" />
        </IconButton>
      </Box>
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        {fields.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              gap: 1,
              display: 'grid',
              alignItems: 'flex-start',
              gridTemplateColumns: '32px minmax(0, 1fr) 36px',
            }}
          >
            <Typography variant="body2" sx={{ pt: 1.75, textAlign: 'center', fontWeight: 700 }}>
              {index + 1}.
            </Typography>
            <Field.Text
              required
              multiline
              minRows={2}
              disabled={disabled}
              name={`learningObjectives.${categoryIndex}.items.${index}.content`}
              placeholder={`กรอกจุดประสงค์${groupLabel || ''}`}
              slotProps={{
                htmlInput: { 'aria-label': `${groupName} รายการที่ ${index + 1}` },
              }}
            />
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              aria-label={`ลบ${groupName} รายการที่ ${index + 1}`}
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
        เพิ่มรายการใน{groupName}
      </Button>
    </Box>
  );
}

type ObjectivesTabProps = {
  isEditable: boolean;
};

export const ObjectivesTab = memo(function ObjectivesTab({ isEditable }: ObjectivesTabProps) {
  const { control } = useFormContext<LessonPlanFormValues>();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'learningObjectives',
  });

  return (
    <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, display: 'block' }}>
      <Box sx={{ gap: 2.5, display: 'grid' }}>
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
            <Typography variant="h6">2. จุดประสงค์การเรียนรู้</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              กำหนดชื่อและรหัสของแต่ละด้านได้อย่างอิสระ
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            disabled={!isEditable}
            startIcon={<RemixIcon icon="mingcute:add-line" />}
            onClick={() => append({ label: '', code: '', items: [{ content: '' }] })}
          >
            เพิ่มด้าน
          </Button>
        </Box>
        {fields.map((group, categoryIndex) => (
          <ObjectiveGroupFields
            key={group.id}
            control={control}
            disabled={!isEditable}
            categoryIndex={categoryIndex}
            onRemove={() =>
              fields.length === 1
                ? update(0, { label: '', code: '', items: [{ content: '' }] })
                : remove(categoryIndex)
            }
          />
        ))}
      </Box>
    </Card>
  );
});
