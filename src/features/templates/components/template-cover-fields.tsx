'use client';

import { useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';

import { Field } from 'src/components/hook-form';

type CoverSubject = {
  code: string | null;
  name: string;
  learningArea: string | null;
  gradeLevels: string[];
  topics: string[];
};

type TemplateCoverFieldsProps = {
  prefix: string;
  learningAreaField: string;
  subjects: CoverSubject[];
  learningAreas: string[];
  gradeLevels: string[];
  academicYears?: string[];
  semesters?: string[];
  disabled?: boolean;
  hideSubjectFields?: boolean;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

export function TemplateCoverFields({
  prefix,
  learningAreaField,
  subjects,
  learningAreas,
  gradeLevels,
  academicYears = [],
  semesters = [],
  disabled = false,
  hideSubjectFields = false,
}: TemplateCoverFieldsProps) {
  const { setValue } = useFormContext();
  const subjectNames = unique(subjects.map((subject) => subject.name));
  const subjectCodes = unique(subjects.map((subject) => subject.code));

  const setSubjectDefaults = (subject: CoverSubject | undefined) => {
    if (!subject) return;
    setValue(`${prefix}.subjectName`, subject.name, { shouldDirty: true });
    setValue(`${prefix}.subjectCode`, subject.code ?? '', { shouldDirty: true });
    if (subject.learningArea) {
      setValue(learningAreaField, subject.learningArea, { shouldDirty: true });
    }
    if (subject.gradeLevels.length === 1) {
      setValue(`${prefix}.gradeLevel`, subject.gradeLevels[0], { shouldDirty: true });
    }
  };

  const autocomplete = (
    name: string,
    label: string,
    options: string[],
    onSelected?: (value: string) => void,
    sx?: object
  ) => (
    <Field.Autocomplete
      name={name}
      label={label}
      freeSolo
      autoSelect
      forcePopupIcon
      disabled={disabled}
      keyOption={{ label: 'label', value: 'value' }}
      options={options.map((option) => ({ label: option, value: option }))}
      onChange={(_, value) => {
        const nextValue = typeof value === 'string' ? value : (value?.value ?? '');
        setValue(name, nextValue, { shouldDirty: true, shouldValidate: true });
        onSelected?.(nextValue);
      }}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setValue(name, value, { shouldDirty: true, shouldValidate: true });
        }
      }}
      sx={sx}
    />
  );

  return (
    <Box
      sx={{
        gap: 2,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      {autocomplete(
        learningAreaField,
        'ชื่อหน่วยการเรียนรู้ / กลุ่มสาระการเรียนรู้',
        learningAreas,
        undefined,
        {
          gridColumn: { sm: '1 / -1' },
        }
      )}
      {autocomplete(`${prefix}.gradeLevel`, 'ระดับชั้น', gradeLevels, undefined, {
        gridColumn: { sm: '1 / -1' },
      })}
      {hideSubjectFields
        ? null
        : autocomplete(`${prefix}.subjectName`, 'ชื่อรายวิชา', subjectNames, (value) =>
            setSubjectDefaults(subjects.find((subject) => subject.name === value))
          )}
      {hideSubjectFields
        ? null
        : autocomplete(`${prefix}.subjectCode`, 'รหัสวิชา', subjectCodes, (value) =>
            setSubjectDefaults(subjects.find((subject) => subject.code === value))
          )}
      <Field.Text
        disabled={disabled}
        name={`${prefix}.topic`}
        label="เรื่อง"
        sx={{ gridColumn: { sm: '1 / -1' } }}
      />
      <Field.Text
        disabled={disabled}
        name={`${prefix}.teacherName`}
        label="ผู้สอน"
        sx={{ gridColumn: { sm: '1 / -1' } }}
      />
      <Field.DatePicker
        name={`${prefix}.teachingDate`}
        label="วันที่สอน"
        disabled={disabled}
        format="DD/MM/YYYY"
        slotProps={{ textField: { fullWidth: true } }}
      />
      {autocomplete(`${prefix}.semester`, 'ภาคเรียนที่', semesters)}
      {autocomplete(`${prefix}.academicYear`, 'ปีการศึกษา', academicYears)}
      <Field.Text
        type="number"
        disabled={disabled}
        name={`${prefix}.durationHours`}
        label="เวลา (ชั่วโมง)"
        slotProps={{ htmlInput: { min: 0.5, step: 0.5 } }}
      />
    </Box>
  );
}
