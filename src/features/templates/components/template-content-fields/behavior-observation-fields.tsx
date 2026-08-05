'use client';

import type { TemplateOption, BehaviorObservationContent } from '../../types';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, contentName, useArrayValue } from './helpers';
import { ObjectList, TemplateStarterPicker, SharedEvaluationStudentFields } from './common-fields';

export function BehaviorObservationFields({
  contentPath,
  templateOptions,
  studentRosterPath,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
  studentRosterPath?: string;
}) {
  const behaviors = useArrayValue<BehaviorObservationContent['behaviors'][number]>(
    contentName(contentPath, 'behaviors')
  );
  const students = useArrayValue<BehaviorObservationContent['students'][number]>(
    contentName(contentPath, 'students')
  );

  const addBehavior = () => {
    behaviors.update([...behaviors.value, { id: uid(), title: '' }]);
    students.update(
      students.value.map((student) => ({
        ...student,
        observations: [...student.observations, false],
      }))
    );
  };

  const removeBehavior = (behaviorIndex: number) => {
    behaviors.update(behaviors.value.filter((_, index) => index !== behaviorIndex));
    students.update(
      students.value.map((student) => ({
        ...student,
        observations: student.observations.filter((_, index) => index !== behaviorIndex),
      }))
    );
  };

  return (
    <Box sx={{ gap: 3, display: 'grid' }}>
      <TemplateStarterPicker
        templateType="behavior_observation"
        templateOptions={templateOptions}
        contentPath={contentPath}
      />
      {studentRosterPath ? <SharedEvaluationStudentFields fieldPath={studentRosterPath} /> : null}
      <Alert severity="info">
        แบบสังเกตพฤติกรรมจะเริ่มหน้า PDF ใหม่เสมอ และสรุปผ่าน/ไม่ผ่านจากจำนวนรายการที่พบ
      </Alert>
      <Field.Text required name={contentName(contentPath, 'title')} label="หัวข้อเอกสาร" />
      <Field.Text
        multiline
        minRows={2}
        name={contentName(contentPath, 'instructions')}
        label="คำชี้แจง"
      />

      <ObjectList title="รายการพฤติกรรมที่สังเกต" onAdd={addBehavior}>
        <Box sx={{ gap: 1.25, display: 'grid' }}>
          {behaviors.value.map((behavior, behaviorIndex) => (
            <Box
              key={behavior.id}
              sx={{
                gap: 1,
                display: 'grid',
                alignItems: 'center',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
              }}
            >
              <Typography variant="subtitle2">{behaviorIndex + 1}.</Typography>
              <Field.Text
                required
                size="small"
                name={contentName(contentPath, `behaviors.${behaviorIndex}.title`)}
                label="พฤติกรรม / รายการประเมิน"
              />
              <IconButton
                color="error"
                disabled={behaviors.value.length <= 1}
                onClick={() => removeBehavior(behaviorIndex)}
                aria-label={`ลบพฤติกรรมที่ ${behaviorIndex + 1}`}
              >
                <RemixIcon icon="solar:trash-bin-trash-linear" />
              </IconButton>
            </Box>
          ))}
        </Box>
      </ObjectList>

      <ObjectList
        title="ผลสังเกตรายบุคคล"
        onAdd={
          studentRosterPath
            ? undefined
            : () =>
                students.update([
                  ...students.value,
                  {
                    id: uid(),
                    name: '',
                    observations: behaviors.value.map(() => false),
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
                gap: 1.5,
                display: 'grid',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle2">{studentIndex + 1}.</Typography>
                {studentRosterPath ? (
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {student.name?.trim() || 'ยังไม่ได้ระบุชื่อนักเรียน'}
                  </Typography>
                ) : (
                  <>
                    <Field.Text
                      size="small"
                      name={contentName(contentPath, `students.${studentIndex}.name`)}
                      label="ชื่อ-สกุล"
                      sx={{ flex: 1 }}
                    />
                    <IconButton
                      color="error"
                      disabled={students.value.length <= 1}
                      onClick={() => students.remove(studentIndex)}
                      aria-label={`ลบนักเรียนคนที่ ${studentIndex + 1}`}
                    >
                      <RemixIcon icon="solar:trash-bin-trash-linear" />
                    </IconButton>
                  </>
                )}
              </Box>
              <Box
                sx={{
                  gap: 1,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                {behaviors.value.map((behavior, behaviorIndex) => (
                  <Field.Checkbox
                    key={behavior.id}
                    name={contentName(
                      contentPath,
                      `students.${studentIndex}.observations.${behaviorIndex}`
                    )}
                    label={behavior.title || `พฤติกรรมที่ ${behaviorIndex + 1}`}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </ObjectList>

      <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 1fr' } }}>
        <Field.Text
          type="number"
          name={contentName(contentPath, 'passingMinimum')}
          label="จำนวนรายการขั้นต่ำที่ผ่าน"
          slotProps={{ htmlInput: { min: 0, max: behaviors.value.length } }}
        />
        <Field.Text name={contentName(contentPath, 'passingNote')} label="เกณฑ์การประเมิน" />
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
