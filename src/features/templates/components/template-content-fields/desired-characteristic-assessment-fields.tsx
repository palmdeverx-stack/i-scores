'use client';

import type { TemplateOption, DesiredCharacteristicAssessmentContent } from '../../types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, contentName, useArrayValue } from './helpers';
import { ObjectList, TemplateStarterPicker, SharedEvaluationStudentFields } from './common-fields';

export function DesiredCharacteristicAssessmentFields({
  contentPath,
  templateOptions,
  studentRosterPath,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
  studentRosterPath?: string;
}) {
  const groups = useArrayValue<
    DesiredCharacteristicAssessmentContent['characteristicGroups'][number]
  >(contentName(contentPath, 'characteristicGroups'));
  const students = useArrayValue<DesiredCharacteristicAssessmentContent['students'][number]>(
    contentName(contentPath, 'students')
  );
  const qualityLevels = useArrayValue<
    DesiredCharacteristicAssessmentContent['qualityLevels'][number]
  >(contentName(contentPath, 'qualityLevels'));
  const behaviorCount = groups.value.reduce((sum, group) => sum + group.behaviors.length, 0);
  const behaviorOffset = (groupIndex: number) =>
    groups.value.slice(0, groupIndex).reduce((sum, group) => sum + group.behaviors.length, 0);

  const addGroup = () => {
    groups.update([
      ...groups.value,
      { id: uid(), title: '', behaviors: [{ id: uid(), title: '' }] },
    ]);
    students.update(
      students.value.map((student) => ({ ...student, scores: [...student.scores, 0] }))
    );
  };

  const removeGroup = (groupIndex: number) => {
    const start = behaviorOffset(groupIndex);
    const count = groups.value[groupIndex]?.behaviors.length ?? 0;
    groups.update(groups.value.filter((_, index) => index !== groupIndex));
    students.update(
      students.value.map((student) => ({
        ...student,
        scores: student.scores.filter(
          (_, scoreIndex) => scoreIndex < start || scoreIndex >= start + count
        ),
      }))
    );
  };

  const addBehavior = (groupIndex: number) => {
    const insertAt = behaviorOffset(groupIndex) + groups.value[groupIndex].behaviors.length;
    groups.update(
      groups.value.map((group, index) =>
        index === groupIndex
          ? { ...group, behaviors: [...group.behaviors, { id: uid(), title: '' }] }
          : group
      )
    );
    students.update(
      students.value.map((student) => ({
        ...student,
        scores: [...student.scores.slice(0, insertAt), 0, ...student.scores.slice(insertAt)],
      }))
    );
  };

  const removeBehavior = (groupIndex: number, behaviorIndex: number) => {
    const removeAt = behaviorOffset(groupIndex) + behaviorIndex;
    groups.update(
      groups.value.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              behaviors: group.behaviors.filter(
                (_, indexToRemove) => indexToRemove !== behaviorIndex
              ),
            }
          : group
      )
    );
    students.update(
      students.value.map((student) => ({
        ...student,
        scores: student.scores.filter((_, scoreIndex) => scoreIndex !== removeAt),
      }))
    );
  };

  const flatBehaviors = groups.value.flatMap((group) =>
    group.behaviors.map((behavior) => ({ groupTitle: group.title, ...behavior }))
  );

  return (
    <Box sx={{ gap: 3, display: 'grid' }}>
      <TemplateStarterPicker
        templateType="desired_characteristic_assessment"
        templateOptions={templateOptions}
        contentPath={contentPath}
      />
      {studentRosterPath ? <SharedEvaluationStudentFields fieldPath={studentRosterPath} /> : null}
      <Field.Text required name={contentName(contentPath, 'title')} label="หัวข้อเอกสาร" />
      <Field.Text
        multiline
        minRows={2}
        name={contentName(contentPath, 'instructions')}
        label="คำชี้แจง"
      />

      <ObjectList title="คุณลักษณะและพฤติกรรมที่ประเมิน" onAdd={addGroup}>
        <Box sx={{ gap: 2, display: 'grid' }}>
          {groups.value.map((group, groupIndex) => (
            <Box
              key={group.id}
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
                  name={contentName(contentPath, `characteristicGroups.${groupIndex}.title`)}
                  label={`คุณลักษณะที่ ${groupIndex + 1}`}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RemixIcon icon="mingcute:add-line" />}
                  onClick={() => addBehavior(groupIndex)}
                >
                  เพิ่มพฤติกรรม
                </Button>
                <IconButton
                  color="error"
                  disabled={groups.value.length <= 1}
                  onClick={() => removeGroup(groupIndex)}
                  aria-label={`ลบคุณลักษณะที่ ${groupIndex + 1}`}
                >
                  <RemixIcon icon="solar:trash-bin-trash-linear" />
                </IconButton>
              </Box>
              {group.behaviors.map((behavior, behaviorIndex) => (
                <Box
                  key={behavior.id}
                  sx={{
                    gap: 1,
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {behaviorIndex + 1}.
                  </Typography>
                  <Field.Text
                    required
                    size="small"
                    name={contentName(
                      contentPath,
                      `characteristicGroups.${groupIndex}.behaviors.${behaviorIndex}.title`
                    )}
                    label="พฤติกรรมบ่งชี้"
                  />
                  <IconButton
                    color="error"
                    disabled={group.behaviors.length <= 1}
                    onClick={() => removeBehavior(groupIndex, behaviorIndex)}
                    aria-label={`ลบพฤติกรรมที่ ${behaviorIndex + 1}`}
                  >
                    <RemixIcon icon="solar:trash-bin-trash-linear" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </ObjectList>

      <ObjectList
        title={studentRosterPath ? 'คะแนนคุณลักษณะรายบุคคล' : 'รายชื่อนักเรียนและคะแนน'}
        onAdd={
          studentRosterPath
            ? undefined
            : () =>
                students.update([
                  ...students.value,
                  { id: uid(), name: '', scores: Array.from({ length: behaviorCount }, () => 0) },
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
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                }}
              >
                {flatBehaviors.map((behavior, scoreIndex) => (
                  <Field.Select
                    key={behavior.id}
                    size="small"
                    name={contentName(contentPath, `students.${studentIndex}.scores.${scoreIndex}`)}
                    label={behavior.title || `พฤติกรรมที่ ${scoreIndex + 1}`}
                    helperText={behavior.groupTitle}
                  >
                    <MenuItem value={0}>ยังไม่ประเมิน</MenuItem>
                    <MenuItem value={3}>3 คะแนน</MenuItem>
                    <MenuItem value={2}>2 คะแนน</MenuItem>
                    <MenuItem value={1}>1 คะแนน</MenuItem>
                  </Field.Select>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </ObjectList>

      <ObjectList
        title="เกณฑ์ระดับคุณภาพ"
        onAdd={() =>
          qualityLevels.update([
            ...qualityLevels.value,
            { id: uid(), minimumScore: 0, maximumScore: 0, label: '' },
          ])
        }
      >
        <Box sx={{ gap: 1.25, display: 'grid' }}>
          {qualityLevels.value.map((level, index) => (
            <Box
              key={level.id}
              sx={{
                gap: 1,
                display: 'grid',
                alignItems: 'center',
                gridTemplateColumns: { xs: '1fr', sm: '140px 140px minmax(0, 1fr) auto' },
              }}
            >
              <Field.Text
                size="small"
                type="number"
                name={contentName(contentPath, `qualityLevels.${index}.minimumScore`)}
                label="คะแนนต่ำสุด"
              />
              <Field.Text
                size="small"
                type="number"
                name={contentName(contentPath, `qualityLevels.${index}.maximumScore`)}
                label="คะแนนสูงสุด"
              />
              <Field.Text
                required
                size="small"
                name={contentName(contentPath, `qualityLevels.${index}.label`)}
                label="ระดับคุณภาพ"
              />
              <IconButton
                color="error"
                disabled={qualityLevels.value.length <= 1}
                onClick={() => qualityLevels.remove(index)}
                aria-label={`ลบเกณฑ์ระดับคุณภาพที่ ${index + 1}`}
              >
                <RemixIcon icon="solar:trash-bin-trash-linear" />
              </IconButton>
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
        <Field.Text name={contentName(contentPath, 'passingNote')} label="หมายเหตุเกณฑ์ผ่าน" />
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
