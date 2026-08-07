import type { ComponentProps } from 'react';
import type { LessonPlanAssignment } from '../../lesson-plan-actions';

import { memo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

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
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 250px' },
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
                gridColumn: { md: '1 / -1' },
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <Field.Select
                required
                name="teacherAssignmentId"
                disabled={!isEditable}
                label="รายวิชาและห้องเรียน"
                onChange={(event) => onSelectAssignment(event.target.value)}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              >
                {assignmentOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.subject?.code ? `${option.subject.code} · ` : ''}
                    {option.subject?.name} · {option.classroom?.name} · {option.semester?.name}
                  </MenuItem>
                ))}
              </Field.Select>
              {selectedAssignment?.subject?.learning_units_structured.length ? (
                <Field.Select
                  name="unitId"
                  label="หน่วยการเรียนรู้จากรายวิชา"
                  disabled={!isEditable}
                  onChange={(event) => onSelectUnit(event.target.value)}
                  helperText="เลือกแล้วระบบจะเติมชื่อหน่วยและจำนวนคาบตั้งต้นให้"
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                >
                  <MenuItem value="">กำหนดหน่วยเฉพาะแผนนี้</MenuItem>
                  {selectedAssignment.subject.learning_units_structured.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.code ? `${unit.code} · ` : ''}
                      {unit.name}
                    </MenuItem>
                  ))}
                </Field.Select>
              ) : null}
              <Field.Text
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
              alignItems: 'center',
              flexDirection: 'column',
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
              sx={{ width: 128, height: 128 }}
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
