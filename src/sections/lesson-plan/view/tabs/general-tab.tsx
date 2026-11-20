import type { ComponentProps } from 'react';
import type { LessonPlanAssignment } from '../../lesson-plan-actions';

import { memo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { TemplateCoverFields } from 'src/features/templates/components/template-cover-fields';

import { Field } from 'src/components/hook-form';
import { UploadAvatar } from 'src/components/upload';

import { TEMPLATE_LOGO_ACCEPT, TEMPLATE_LOGO_MAX_SIZE } from '../lesson-plan-form.schema';

// ----------------------------------------------------------------------

type TemplateCoverFieldsProps = ComponentProps<typeof TemplateCoverFields>;

type GeneralTabProps = {
  isTemplateMode: boolean;
  isEditable: boolean;
  isSaving: boolean;
  assignmentOptions: LessonPlanAssignment[];
  selectedAssignment: LessonPlanAssignment | undefined;
  onSelectAssignment: (assignmentId: string) => void;
  onSelectUnit: (unitId: string) => void;
  templateCoverSubjects: TemplateCoverFieldsProps['subjects'];
  templateLearningAreas: TemplateCoverFieldsProps['learningAreas'];
  templateGradeLevels: TemplateCoverFieldsProps['gradeLevels'];
  academicYears?: TemplateCoverFieldsProps['academicYears'];
  semesters?: TemplateCoverFieldsProps['semesters'];
  templateLogo: File | string | null;
  onLogoDrop: (file: File) => void;
  onLogoRemove: () => void;
};

export const GeneralTab = memo(function GeneralTab({
  isTemplateMode,
  isEditable,
  isSaving,
  assignmentOptions,
  selectedAssignment,
  onSelectAssignment,
  onSelectUnit,
  templateCoverSubjects,
  templateLearningAreas,
  templateGradeLevels,
  academicYears,
  semesters,
  templateLogo,
  onLogoDrop,
  onLogoRemove,
}: GeneralTabProps) {
  const { control } = useFormContext();
  const learningUnits = selectedAssignment?.subject?.learning_units_structured ?? [];

  return (
    <Box sx={{ gap: 3, display: 'grid' }}>
      <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Typography variant="h5">ข้อมูลแผน</Typography>
        <Box
          sx={{
            gap: 2.5,
            mt: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <Field.Text
            size="small"
            required
            disabled={!isEditable}
            name="title"
            label={isTemplateMode ? 'ชื่อ Template แผนการสอน' : 'ชื่อแผนการสอน'}
            placeholder="เช่น แผนการจัดการเรียนรู้เรื่องแรงและการเคลื่อนที่"
            sx={{ gridColumn: { sm: '1 / -1' } }}
          />
          {isTemplateMode ? (
            <Alert severity="info" sx={{ gridColumn: { sm: '1 / -1' } }}>
              Template นี้ไม่ผูกรายวิชา ห้องเรียน หรือปีการศึกษา
              ข้อมูลด้านล่างเป็นตัวอย่างตั้งต้นเท่านั้น
            </Alert>
          ) : null}
        </Box>
      </Card>

      <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Box
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'minmax(0, 1fr) minmax(160px, 18%)',
            },
          }}
        >
          <Box sx={{ gridColumn: { md: '1 / -1' } }}>
            <Typography variant="h6">
              {isTemplateMode ? 'ข้อมูลตัวอย่าง' : 'ข้อมูลเอกสาร'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isTemplateMode
                ? 'ใช้กับพรีวิว Template เท่านั้น แผนจริงจะใช้ข้อมูลรายวิชาและห้องเรียน'
                : 'ข้อมูลนี้จะแสดงบนหน้าปกของเอกสาร PDF ระบบเติมข้อมูลรายวิชาและห้องเรียนให้อัตโนมัติจากรายวิชาที่เลือกด้านล่าง แก้ไขเพิ่มเติมได้ตามต้องการ'}
            </Typography>
          </Box>

          {isTemplateMode ? null : (
            <Box
              sx={{
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 112px' },
              }}
            >
              <Controller
                name="teacherAssignmentId"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <Autocomplete
                    size="small"
                    disabled={!isEditable}
                    options={assignmentOptions}
                    value={selectedAssignment ?? null}
                    getOptionKey={(option) => option.id}
                    getOptionLabel={(option) =>
                      [
                        option.subject?.code,
                        option.subject?.name,
                        option.classroom?.name,
                        option.semester?.name,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    }
                    onBlur={field.onBlur}
                    onChange={(_, option) => {
                      const id = option?.id ?? '';
                      field.onChange(id);
                      onSelectAssignment(id);
                    }}
                    noOptionsText="ไม่พบรายวิชาและห้องเรียน"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        inputRef={field.ref}
                        required
                        label="รายวิชาและห้องเรียน"
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                    sx={{ gridColumn: learningUnits.length ? '1 / -1' : undefined }}
                  />
                )}
              />
              {learningUnits.length ? (
                <Controller
                  name="unitId"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <Autocomplete
                      size="small"
                      disabled={!isEditable}
                      options={learningUnits}
                      value={learningUnits.find((unit) => unit.id === field.value) ?? null}
                      getOptionKey={(unit) => unit.id}
                      getOptionLabel={(unit) => [unit.code, unit.name].filter(Boolean).join(' · ')}
                      onBlur={field.onBlur}
                      onChange={(_, unit) => {
                        field.onChange(unit?.id ?? null);
                        onSelectUnit(unit?.id ?? '');
                      }}
                      noOptionsText="ไม่พบหน่วยการเรียนรู้"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          inputRef={field.ref}
                          label="หน่วยการเรียนรู้จากรายวิชา"
                          error={!!error}
                          helperText={
                            error?.message ?? 'เลือกแล้วระบบจะเติมชื่อหน่วยและจำนวนคาบตั้งต้นให้'
                          }
                        />
                      )}
                    />
                  )}
                />
              ) : null}
              <Field.Text
                size="small"
                required
                disabled={!isEditable}
                type="number"
                name="unitNumber"
                label="หน่วยที่"
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Box>
          )}

          <TemplateCoverFields
            prefix="templateSectionContents.cover"
            learningAreaField="unitName"
            subjects={templateCoverSubjects}
            learningAreas={templateLearningAreas}
            gradeLevels={templateGradeLevels}
            academicYears={academicYears}
            semesters={semesters}
            disabled={!isEditable}
            hideSubjectFields={!isTemplateMode}
          />
          <Box
            sx={{
              gap: 1,
              display: 'flex',
              alignSelf: 'start',
              alignItems: 'center',
              flexDirection: 'column',
              gridColumn: { md: 2 },
              gridRow: { md: isTemplateMode ? 2 : '2 / span 2' },
              pt: { xs: 1, md: 0 },
            }}
          >
            <Typography variant="subtitle2">โลโก้บนเอกสาร</Typography>
            <UploadAvatar
              value={templateLogo}
              accept={TEMPLATE_LOGO_ACCEPT}
              maxSize={TEMPLATE_LOGO_MAX_SIZE}
              disabled={!isEditable || isSaving}
              onDrop={(files) => {
                const file = files[0];
                if (file) onLogoDrop(file);
              }}
              sx={{ width: 112, height: 112 }}
            />
            {templateLogo ? (
              <Button
                size="small"
                color="error"
                disabled={!isEditable || isSaving}
                onClick={onLogoRemove}
              >
                ลบโลโก้
              </Button>
            ) : null}
            <Typography variant="caption" color="text.secondary" textAlign="center">
              PNG, JPEG หรือ WEBP ไม่เกิน 2MB
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
});
