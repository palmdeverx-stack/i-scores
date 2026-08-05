'use client';

import type { TemplateOption, CompetencyAssessmentContent } from '../../types';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Field } from 'src/components/hook-form';
import { RemixIcon } from 'src/components/remix-icon';

import { uid, contentName, useArrayValue } from './helpers';
import { ObjectList, TemplateStarterPicker, SharedEvaluationStudentFields } from './common-fields';

export function CompetencyAssessmentFields({
  contentPath,
  templateOptions,
  studentRosterPath,
}: {
  contentPath: string;
  templateOptions: TemplateOption[];
  studentRosterPath?: string;
}) {
  const domains = useArrayValue<CompetencyAssessmentContent['domains'][number]>(
    contentName(contentPath, 'domains')
  );
  const students = useArrayValue<CompetencyAssessmentContent['students'][number]>(
    contentName(contentPath, 'students')
  );
  const qualityLevels = useArrayValue<CompetencyAssessmentContent['qualityLevels'][number]>(
    contentName(contentPath, 'qualityLevels')
  );

  const addDomain = () => {
    domains.update([...domains.value, { id: uid(), title: '', competencyLabel: '' }]);
    students.update(
      students.value.map((student) => ({ ...student, scores: [...student.scores, 0] }))
    );
  };

  const removeDomain = (domainIndex: number) => {
    domains.update(domains.value.filter((_, index) => index !== domainIndex));
    students.update(
      students.value.map((student) => ({
        ...student,
        scores: student.scores.filter((_, scoreIndex) => scoreIndex !== domainIndex),
      }))
    );
  };

  return (
    <Box sx={{ gap: 3, display: 'grid' }}>
      <TemplateStarterPicker
        templateType="competency_assessment"
        templateOptions={templateOptions}
        contentPath={contentPath}
      />
      <Alert severity="info">
        PDF จะแยกสมรรถนะแต่ละด้านขึ้นหน้าใหม่เสมอ โดยใช้รายชื่อนักเรียนและเกณฑ์ร่วมกัน
      </Alert>
      <Field.Text required name={contentName(contentPath, 'title')} label="หัวข้อเอกสาร" />
      <Field.Text
        multiline
        minRows={2}
        name={contentName(contentPath, 'instructions')}
        label="คำชี้แจง"
      />

      {studentRosterPath ? (
        <SharedEvaluationStudentFields fieldPath={studentRosterPath} />
      ) : (
        <ObjectList
          title="รายชื่อนักเรียน"
          onAdd={() =>
            students.update([
              ...students.value,
              { id: uid(), name: '', scores: domains.value.map(() => 0) },
            ])
          }
        >
          <Box sx={{ gap: 1.5, display: 'grid' }}>
            {students.value.map((student, studentIndex) => (
              <Box key={student.id} sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ width: 28 }}>
                  {studentIndex + 1}.
                </Typography>
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
              </Box>
            ))}
          </Box>
        </ObjectList>
      )}

      <Box sx={{ gap: 1.5, display: 'grid' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1">สมรรถนะรายด้าน</Typography>
            <Typography variant="body2" color="text.secondary">
              แต่ละ Card เก็บคะแนนนักเรียนแยกอิสระ และออก PDF ด้านละ 1 หน้า
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RemixIcon icon="mingcute:add-line" />}
            onClick={addDomain}
          >
            เพิ่มด้าน
          </Button>
        </Box>

        {domains.value.map((domain, domainIndex) => (
          <Box
            key={domain.id}
            sx={{
              p: { xs: 2, md: 2.5 },
              gap: 2,
              display: 'grid',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.vars.customShadows.z1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6">
                  ด้านที่ {domainIndex + 1}: {domain.title || 'ยังไม่ได้ระบุชื่อด้าน'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  หน้า PDF ที่ {domainIndex + 1} ของแบบประเมินสมรรถนะ
                </Typography>
              </Box>
              <IconButton
                color="error"
                disabled={domains.value.length <= 1}
                onClick={() => removeDomain(domainIndex)}
                aria-label={`ลบสมรรถนะด้านที่ ${domainIndex + 1}`}
              >
                <RemixIcon icon="solar:trash-bin-trash-linear" />
              </IconButton>
            </Box>

            <Box
              sx={{
                gap: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.7fr) minmax(0, 1.3fr)' },
              }}
            >
              <Field.Text
                required
                size="small"
                name={contentName(contentPath, `domains.${domainIndex}.title`)}
                label="ชื่อด้าน"
                placeholder="เช่น ด้านการคิด"
              />
              <Field.Text
                required
                size="small"
                name={contentName(contentPath, `domains.${domainIndex}.competencyLabel`)}
                label="รายการที่สังเกต"
                placeholder="เช่น ด้านความสามารถในการคิด"
              />
            </Box>

            <Divider />
            <Typography variant="subtitle2">คะแนนนักเรียนด้านนี้</Typography>
            <Box sx={{ gap: 1, display: 'grid' }}>
              {students.value.map((student, studentIndex) => (
                <Box
                  key={`${domain.id}-${student.id}`}
                  sx={{
                    gap: 1.5,
                    display: 'grid',
                    alignItems: 'center',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 220px' },
                  }}
                >
                  <Typography variant="body2">
                    {studentIndex + 1}. {student.name?.trim() || 'ยังไม่ได้ระบุชื่อนักเรียน'}
                  </Typography>
                  <Field.Select
                    size="small"
                    name={contentName(
                      contentPath,
                      `students.${studentIndex}.scores.${domainIndex}`
                    )}
                    label={`คะแนน${domain.title || `ด้านที่ ${domainIndex + 1}`}`}
                  >
                    <MenuItem value={0}>0 — ยังไม่แสดงพฤติกรรม</MenuItem>
                    <MenuItem value={3}>3 — ดีมาก</MenuItem>
                    <MenuItem value={2}>2 — ดี</MenuItem>
                    <MenuItem value={1}>1 — พอใช้</MenuItem>
                  </Field.Select>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      <ObjectList
        title="เกณฑ์การให้คะแนน"
        onAdd={() =>
          qualityLevels.update([...qualityLevels.value, { id: uid(), score: 0, label: '' }])
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
                gridTemplateColumns: { xs: '1fr', sm: '140px minmax(0, 1fr) auto' },
              }}
            >
              <Field.Text
                size="small"
                type="number"
                name={contentName(contentPath, `qualityLevels.${index}.score`)}
                label="คะแนน"
                slotProps={{ htmlInput: { min: 0, max: 3 } }}
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
                aria-label={`ลบเกณฑ์คะแนนที่ ${index + 1}`}
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
          slotProps={{ htmlInput: { min: 0, max: 3 } }}
        />
        <Field.Text name={contentName(contentPath, 'passingNote')} label="เกณฑ์การตัดสิน" />
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
