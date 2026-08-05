'use client';

import type { TemplateOption, WorksheetAssessmentRecordContent } from '../../types';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, contentName, useArrayValue } from './helpers';
import { ObjectList, TemplateStarterPicker, SharedEvaluationStudentFields } from './common-fields';

export function WorksheetAssessmentRecordFields({
  contentPath,
  templateOptions,
  studentRosterPath,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
  studentRosterPath?: string;
}) {
  const scoreColumns = useArrayValue<WorksheetAssessmentRecordContent['scoreColumns'][number]>(
    contentName(contentPath, 'scoreColumns')
  );
  const students = useArrayValue<WorksheetAssessmentRecordContent['students'][number]>(
    contentName(contentPath, 'students')
  );
  const rubricCriteria = useArrayValue<WorksheetAssessmentRecordContent['rubricCriteria'][number]>(
    contentName(contentPath, 'rubricCriteria')
  );

  const addScoreColumn = () => {
    scoreColumns.update([...scoreColumns.value, { id: uid(), title: '', maximumScore: 4 }]);
    students.update(
      students.value.map((student) => ({ ...student, scores: [...student.scores, 0] }))
    );
  };

  const removeScoreColumn = (index: number) => {
    scoreColumns.update(scoreColumns.value.filter((_, columnIndex) => columnIndex !== index));
    students.update(
      students.value.map((student) => ({
        ...student,
        scores: student.scores.filter((_, scoreIndex) => scoreIndex !== index),
      }))
    );
  };

  return (
    <Box sx={{ gap: 3, display: 'grid' }}>
      <TemplateStarterPicker
        templateType="worksheet_assessment_record"
        templateOptions={templateOptions}
        contentPath={contentPath}
      />
      {studentRosterPath ? <SharedEvaluationStudentFields fieldPath={studentRosterPath} /> : null}

      <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Field.Text required name={contentName(contentPath, 'title')} label="หัวข้อเอกสาร" />
        <Field.Text name={contentName(contentPath, 'topic')} label="เรื่อง / ชื่อใบงาน" />
      </Box>

      <ObjectList title="หัวข้อคะแนน" onAdd={addScoreColumn}>
        <Box sx={{ gap: 1.5, display: 'grid' }}>
          {scoreColumns.value.map((column, index) => (
            <Box
              key={column.id}
              sx={{
                gap: 1,
                display: 'grid',
                alignItems: 'center',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 150px auto' },
              }}
            >
              <Field.Text
                required
                size="small"
                name={contentName(contentPath, `scoreColumns.${index}.title`)}
                label={`หัวข้อคะแนนที่ ${index + 1}`}
              />
              <Field.Text
                required
                size="small"
                type="number"
                name={contentName(contentPath, `scoreColumns.${index}.maximumScore`)}
                label="คะแนนเต็ม"
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <IconButton
                color="error"
                disabled={scoreColumns.value.length <= 1}
                onClick={() => removeScoreColumn(index)}
                aria-label={`ลบหัวข้อคะแนนที่ ${index + 1}`}
              >
                <RemixIcon icon="solar:trash-bin-trash-linear" />
              </IconButton>
            </Box>
          ))}
        </Box>
      </ObjectList>

      <ObjectList
        title={studentRosterPath ? 'ผลการประเมินรายบุคคล' : 'รายชื่อนักเรียนและผลการประเมิน'}
        onAdd={
          studentRosterPath
            ? undefined
            : () =>
                students.update([
                  ...students.value,
                  {
                    id: uid(),
                    name: '',
                    scores: scoreColumns.value.map(() => 0),
                    result: '',
                  },
                ])
        }
      >
        <Box sx={{ gap: 1.5, display: 'grid' }}>
          {students.value.map((student, studentIndex) => (
            <Box
              key={student.id}
              sx={{
                p: 1.5,
                gap: 1.25,
                display: 'grid',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">
                  {studentIndex + 1}. {student.name?.trim() || 'ยังไม่ได้ระบุชื่อนักเรียน'}
                </Typography>
                {!studentRosterPath ? (
                  <IconButton
                    color="error"
                    disabled={students.value.length <= 1}
                    onClick={() => students.remove(studentIndex)}
                    aria-label={`ลบนักเรียนคนที่ ${studentIndex + 1}`}
                  >
                    <RemixIcon icon="solar:trash-bin-trash-linear" />
                  </IconButton>
                ) : null}
              </Box>
              {!studentRosterPath ? (
                <Field.Text
                  size="small"
                  name={contentName(contentPath, `students.${studentIndex}.name`)}
                  label="ชื่อ-สกุล"
                />
              ) : null}
              <Box
                sx={{
                  gap: 1,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    md: `repeat(${Math.min(scoreColumns.value.length + 1, 4)}, minmax(0, 1fr))`,
                  },
                }}
              >
                {scoreColumns.value.map((column, scoreIndex) => (
                  <Field.Text
                    key={column.id}
                    size="small"
                    type="number"
                    name={contentName(contentPath, `students.${studentIndex}.scores.${scoreIndex}`)}
                    label={`${column.title || `หัวข้อ ${scoreIndex + 1}`} (${column.maximumScore})`}
                    slotProps={{ htmlInput: { min: 0, max: column.maximumScore } }}
                  />
                ))}
                <Field.Select
                  size="small"
                  name={contentName(contentPath, `students.${studentIndex}.result`)}
                  label="ผลการประเมิน"
                >
                  <MenuItem value="">คำนวณอัตโนมัติ</MenuItem>
                  <MenuItem value="ผ่าน">ผ่าน</MenuItem>
                  <MenuItem value="ไม่ผ่าน">ไม่ผ่าน</MenuItem>
                </Field.Select>
              </Box>
            </Box>
          ))}
        </Box>
      </ObjectList>

      <ObjectList
        title="เกณฑ์การประเมินใบงาน"
        onAdd={() =>
          rubricCriteria.update([
            ...rubricCriteria.value,
            {
              id: uid(),
              title: '',
              levels: [4, 3, 2, 1].map((level) => ({
                level,
                label:
                  level === 4 ? 'ดีมาก' : level === 3 ? 'ดี' : level === 2 ? 'พอใช้' : 'ปรับปรุง',
                description: '',
              })),
            },
          ])
        }
      >
        <Box sx={{ gap: 2, display: 'grid' }}>
          {rubricCriteria.value.map((criterion, criterionIndex) => (
            <Box
              key={criterion.id}
              sx={{
                p: 2,
                gap: 1.5,
                display: 'grid',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
                <Field.Text
                  required
                  size="small"
                  name={contentName(contentPath, `rubricCriteria.${criterionIndex}.title`)}
                  label={`รายการประเมินที่ ${criterionIndex + 1}`}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  color="error"
                  disabled={rubricCriteria.value.length <= 1}
                  onClick={() => rubricCriteria.remove(criterionIndex)}
                  aria-label={`ลบรายการประเมินที่ ${criterionIndex + 1}`}
                >
                  <RemixIcon icon="solar:trash-bin-trash-linear" />
                </IconButton>
              </Box>
              <Box
                sx={{
                  gap: 1,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                }}
              >
                {criterion.levels.map((level, levelIndex) => (
                  <Box
                    key={`${criterion.id}-${level.level}`}
                    sx={{ gap: 1, display: 'grid', gridTemplateColumns: '110px 1fr' }}
                  >
                    <Field.Text
                      size="small"
                      name={contentName(
                        contentPath,
                        `rubricCriteria.${criterionIndex}.levels.${levelIndex}.label`
                      )}
                      label={`ระดับ ${level.level}`}
                    />
                    <Field.Text
                      size="small"
                      multiline
                      name={contentName(
                        contentPath,
                        `rubricCriteria.${criterionIndex}.levels.${levelIndex}.description`
                      )}
                      label="รายละเอียดเกณฑ์"
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </ObjectList>

      <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 1fr' } }}>
        <Field.Text
          type="number"
          name={contentName(contentPath, 'passingScore')}
          label="คะแนนผ่าน"
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <Field.Text name={contentName(contentPath, 'passingCriteria')} label="เกณฑ์การผ่าน" />
      </Box>
      <Divider />
      <Typography variant="subtitle1">ข้อมูลผู้ประเมิน</Typography>
      <Box
        sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}
      >
        <Field.Text name={contentName(contentPath, 'evaluatorName')} label="ชื่อผู้ประเมิน" />
        <Field.Text name={contentName(contentPath, 'evaluatorRole')} label="ตำแหน่ง / บทบาท" />
        <Field.Text
          type="date"
          name={contentName(contentPath, 'evaluationDate')}
          label="วันที่ประเมิน"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>
    </Box>
  );
}
