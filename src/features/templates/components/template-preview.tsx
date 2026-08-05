'use client';

import type {
  TemplateType,
  RubricContent,
  LearningStandardContent,
  LessonPlanTemplateContent,
  BehaviorObservationContent,
  CompetencyAssessmentContent,
  WorksheetAssessmentRecordContent,
  DesiredCharacteristicAssessmentContent,
} from '../types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { TEMPLATE_TYPE_LABELS } from '../constants';

function renderStructuredItemsList(rawItems: unknown) {
  const items = ((rawItems ?? []) as unknown[]).map((item, index) => {
    if (typeof item === 'string' || typeof item === 'number')
      return { id: String(index), code: '', title: String(item), description: '' };
    const row = (item ?? {}) as Record<string, unknown>;
    const code = String(row.code ?? '');
    const title = String(row.title ?? row.name ?? row.description ?? code);
    return {
      id: String(row.id ?? index),
      code,
      title,
      description: row.title ? String(row.description ?? '') : '',
    };
  });

  return (
    <Box component="ol" sx={{ m: 0, pl: 3 }}>
      {items.map((item) => (
        <Box component="li" key={item.id} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2">
            {[item.code, item.title].filter(Boolean).join(' — ') || 'ยังไม่ระบุรายการ'}
          </Typography>
          {item.description ? (
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {item.description}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

export function TemplatePreview({
  templateType,
  templateName,
  content,
}: {
  templateType: TemplateType;
  templateName?: string;
  content: Record<string, unknown>;
}) {
  if (templateType === 'lesson_plan') {
    const lessonPlanContent = content as unknown as LessonPlanTemplateContent;
    const cover = lessonPlanContent.cover ?? {};
    const value = (text?: string | null) => text?.trim() || '-';
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 4 },
          minHeight: 480,
          bgcolor: 'common.white',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: (theme) => theme.vars.customShadows.z8,
        }}
      >
        {cover.logoUrl ? (
          <Box
            component="img"
            src={cover.logoUrl}
            alt="โลโก้บนเอกสาร"
            sx={{
              width: 88,
              height: 88,
              mx: 'auto',
              mb: 2,
              display: 'block',
              objectFit: 'contain',
            }}
          />
        ) : null}
        <Typography variant="h5" textAlign="center">
          {value(templateName)}
        </Typography>
        <Box
          sx={{
            gap: 3,
            mt: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 2fr) minmax(180px, 1fr)' },
          }}
        >
          <Box sx={{ gap: 0.75, display: 'grid' }}>
            <Typography>กลุ่มสาระการเรียนรู้ {value(cover.learningArea)}</Typography>
            <Typography>
              รายวิชา {value(cover.subjectName)} รหัสวิชา {value(cover.subjectCode)}
            </Typography>
            <Typography>เรื่อง {value(cover.topic)}</Typography>
            <Typography>ผู้สอน {value(cover.teacherName)}</Typography>
            <Typography>วันที่สอน {value(cover.teachingDate)}</Typography>
          </Box>
          <Box sx={{ gap: 0.75, display: 'grid', alignContent: 'start' }}>
            <Typography>ชั้น {value(cover.gradeLevel)}</Typography>
            <Typography>ภาคเรียนที่ {value(cover.semester)}</Typography>
            <Typography>
              เวลา {cover.durationHours ? `${cover.durationHours} ชั่วโมง` : '-'}
            </Typography>
            <Typography>ปีการศึกษา {value(cover.academicYear)}</Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Box sx={{ gap: 1, display: 'grid' }}>
          {lessonPlanContent.sections
            .filter((section) => section.enabled !== false)
            .map((section, index) => (
              <Box
                key={section.id}
                sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Typography variant="subtitle2">
                  {index + 1}. {section.title || 'ยังไม่ระบุหัวข้อ'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {TEMPLATE_TYPE_LABELS[section.sectionType]}
                </Typography>
                {section.content ? (
                  <Box sx={{ mt: 1.5 }}>
                    <TemplatePreview
                      templateType={section.sectionType}
                      content={section.content as unknown as Record<string, unknown>}
                    />
                  </Box>
                ) : null}
              </Box>
            ))}
        </Box>
      </Box>
    );
  }
  if (templateType === 'learning_objective') {
    const domainLabels: Record<string, string> = {
      knowledge: 'ความรู้ (K)',
      process: 'ทักษะ/กระบวนการ (P)',
      attitude: 'เจตคติ (A)',
    };
    type ObjectivePreview = {
      id?: string;
      description?: string;
      domain?: string;
      behaviorVerb?: string;
      condition?: string;
      expectedResult?: string;
      successCriteria?: string;
    };
    const objectives =
      (content.objectives as ObjectivePreview[] | undefined) ??
      ([
        {
          id: 'legacy-objective',
          description: String(content.description ?? ''),
          domain: String(content.domain ?? 'knowledge'),
          behaviorVerb: String(content.behaviorVerb ?? ''),
          condition: String(content.condition ?? ''),
          expectedResult: String(content.expectedResult ?? ''),
          successCriteria: String(content.successCriteria ?? ''),
        },
      ] satisfies ObjectivePreview[]);
    return (
      <Box sx={{ gap: 1.25, display: 'grid' }}>
        {objectives.map((objective, index) => {
          const statement =
            [objective.condition, objective.behaviorVerb, objective.expectedResult]
              .filter(Boolean)
              .join(' ') ||
            objective.description ||
            'ยังไม่ครบข้อมูล';

          return (
            <Box
              key={objective.id ?? index}
              sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <Typography variant="subtitle2" sx={{ whiteSpace: 'pre-line' }}>
                {index + 1}. {statement}
              </Typography>
              <Box sx={{ gap: 0.75, mt: 1, display: 'flex', flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={domainLabels[objective.domain || 'knowledge'] || objective.domain}
                />
                {objective.behaviorVerb ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`คำกริยา: ${objective.behaviorVerb}`}
                  />
                ) : null}
              </Box>
              {[
                ['condition', 'เงื่อนไข'],
                ['expectedResult', 'ผลลัพธ์ที่คาดหวัง'],
                ['successCriteria', 'เกณฑ์ความสำเร็จ'],
              ].map(([key, label]) => {
                const value = objective[key as keyof typeof objective];
                return value ? (
                  <Box key={key} sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">{label}</Typography>
                    <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {String(value)}
                    </Typography>
                  </Box>
                ) : null;
              })}
            </Box>
          );
        })}
      </Box>
    );
  }
  if (templateType === 'learning_standard') {
    const learningStandardContent = content as unknown as LearningStandardContent;
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Box>
          <Typography variant="subtitle1">มาตรฐานการเรียนรู้</Typography>
          {renderStructuredItemsList(learningStandardContent.items)}
        </Box>
        <Box>
          <Typography variant="subtitle1">ตัวชี้วัดระหว่างทาง</Typography>
          {renderStructuredItemsList(learningStandardContent.milestoneIndicators)}
        </Box>
        <Box>
          <Typography variant="subtitle1">ตัวชี้วัดปลายทาง</Typography>
          {renderStructuredItemsList(learningStandardContent.terminalIndicators)}
        </Box>
      </Box>
    );
  }
  if (
    ['competency', 'desired_characteristic', 'learner_development', 'learning_task'].includes(
      templateType
    )
  ) {
    return renderStructuredItemsList(content.items);
  }
  if (templateType === 'rubric') {
    const criteria = (content.criteria ?? []) as RubricContent['criteria'];
    const levels = criteria[0]?.levels ?? [];
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>เกณฑ์</TableCell>
              {levels.map((level) => (
                <TableCell key={level.id} align="center">
                  {level.label || `ระดับ ${level.level}`}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {criteria.map((criterion) => (
              <TableRow key={criterion.id}>
                <TableCell>
                  <Typography variant="subtitle2">
                    {criterion.name || 'ยังไม่ระบุชื่อเกณฑ์'}
                  </Typography>
                  {criterion.weight ? (
                    <Typography variant="caption">น้ำหนัก {criterion.weight}%</Typography>
                  ) : null}
                </TableCell>
                {criterion.levels.map((level) => (
                  <TableCell key={level.id}>
                    <Typography variant="caption">
                      {level.description || '—'} ({level.score})
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
  if (templateType === 'learning_activity') {
    const phaseLabels: Record<string, string> = {
      introduction: 'นำเข้าสู่บทเรียน',
      learning: 'จัดการเรียนรู้',
      practice: 'ฝึกปฏิบัติ',
      conclusion: 'สรุปบทเรียน',
    };
    return (
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        <Typography variant="h6">{String(content.activityName || 'ชื่อกิจกรรม')}</Typography>
        <Chip
          size="small"
          sx={{ width: 'fit-content' }}
          label={`${phaseLabels[String(content.phase || 'learning')]} · ${String(content.durationMinutes || 0)} นาที`}
        />
        {content.teachingMethod ? (
          <Typography color="text.secondary">
            รูปแบบการสอน: {String(content.teachingMethod)}
          </Typography>
        ) : null}
        {[
          ['objectives', 'จุดประสงค์ของกิจกรรม'],
          ['teacherActions', 'สิ่งที่ครูทำ'],
          ['studentActions', 'สิ่งที่นักเรียนทำ'],
          ['requiredMaterials', 'วัสดุหรือสื่อที่ใช้'],
          ['expectedOutputs', 'ผลงานที่คาดหวัง'],
        ].map(([key, label]) => (
          <Box key={key}>
            <Typography variant="subtitle2">{label}</Typography>
            <Box component="ol" sx={{ mt: 0.5 }}>
              {((content[key] ?? []) as string[]).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }
  if (templateType === 'assessment')
    return (
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        {[
          ['method', 'วิธี'],
          ['instrument', 'เครื่องมือ'],
          ['evidence', 'หลักฐาน'],
          ['criteria', 'เกณฑ์'],
        ].map(([key, label]) => (
          <Box key={key}>
            <Typography variant="subtitle2">{label}</Typography>
            <Typography color="text.secondary">{String(content[key] || '—')}</Typography>
          </Box>
        ))}
      </Box>
    );
  if (templateType === 'question')
    return (
      <Box component="ol" sx={{ m: 0, pl: 3 }}>
        {(
          (content.questions ?? []) as Array<{
            id: string;
            question: string;
            bloomLevel?: string;
            expectedAnswer?: string;
            followUpQuestions?: string[];
          }>
        ).map((item) => (
          <Box component="li" key={item.id} sx={{ mb: 1.5 }}>
            <Typography>{item.question || 'คำถาม'}</Typography>
            {item.bloomLevel ? <Chip size="small" variant="soft" label={item.bloomLevel} /> : null}
            {item.expectedAnswer ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                แนวคำตอบ: {item.expectedAnswer}
              </Typography>
            ) : null}
            {item.followUpQuestions?.length ? (
              <Typography variant="caption" color="text.secondary" display="block">
                คำถามต่อยอด: {item.followUpQuestions.join(' · ')}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Box>
    );
  if (templateType === 'worksheet_assessment_record') {
    const record = content as unknown as WorksheetAssessmentRecordContent;
    const columns = record.scoreColumns ?? [];
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6">{record.title || 'แบบบันทึกผลการประเมินใบงาน'}</Typography>
          <Typography color="text.secondary">เรื่อง {record.topic || '-'}</Typography>
        </Box>
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ที่</TableCell>
                <TableCell>ชื่อ-สกุล</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.id} align="center">
                    {column.title} ({column.maximumScore})
                  </TableCell>
                ))}
                <TableCell align="center">รวม</TableCell>
                <TableCell align="center">ผล</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(record.students ?? []).map((student, index) => {
                const total = (student.scores ?? []).reduce(
                  (sum, score) => sum + Number(score || 0),
                  0
                );
                return (
                  <TableRow key={student.id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{student.name || '-'}</TableCell>
                    {columns.map((column, scoreIndex) => (
                      <TableCell key={column.id} align="center">
                        {student.scores?.[scoreIndex] ?? 0}
                      </TableCell>
                    ))}
                    <TableCell align="center">{total}</TableCell>
                    <TableCell align="center">
                      {student.result ||
                        (total >= Number(record.passingScore || 0) ? 'ผ่าน' : 'ไม่ผ่าน')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="subtitle2">เกณฑ์การประเมินใบงาน</Typography>
        {(record.rubricCriteria ?? []).map((criterion, index) => (
          <Box key={criterion.id || index}>
            <Typography variant="body2">
              {index + 1}. {criterion.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {criterion.levels
                .map((level) => `${level.level} (${level.label}): ${level.description}`)
                .join(' · ')}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }
  if (templateType === 'desired_characteristic_assessment') {
    const assessment = content as unknown as DesiredCharacteristicAssessmentContent;
    const behaviors = (assessment.characteristicGroups ?? []).flatMap((group) =>
      group.behaviors.map((behavior) => ({ groupTitle: group.title, ...behavior }))
    );
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6">
            {assessment.title || 'แบบประเมินคุณลักษณะอันพึงประสงค์'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {assessment.instructions || '-'}
          </Typography>
        </Box>
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ที่</TableCell>
                <TableCell>ชื่อ-สกุล</TableCell>
                {behaviors.map((behavior) => (
                  <TableCell key={behavior.id} align="center">
                    {behavior.title}
                  </TableCell>
                ))}
                <TableCell align="center">รวม</TableCell>
                <TableCell align="center">ผล</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(assessment.students ?? []).map((student, index) => {
                const total = (student.scores ?? []).reduce(
                  (sum, score) => sum + Number(score || 0),
                  0
                );
                return (
                  <TableRow key={student.id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{student.name || '-'}</TableCell>
                    {behaviors.map((behavior, scoreIndex) => (
                      <TableCell key={behavior.id} align="center">
                        {student.scores?.[scoreIndex] || '-'}
                      </TableCell>
                    ))}
                    <TableCell align="center">{total}</TableCell>
                    <TableCell align="center">
                      {total >= Number(assessment.passingScore || 0) ? 'ผ่าน' : 'ไม่ผ่าน'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="body2">หมายเหตุ: {assessment.passingNote || '-'}</Typography>
      </Box>
    );
  }
  if (templateType === 'competency_assessment') {
    const assessment = content as unknown as CompetencyAssessmentContent;
    const firstDomain = assessment.domains?.[0];
    const qualityByScore = new Map(
      (assessment.qualityLevels ?? []).map((level) => [Number(level.score), level.label])
    );
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6">
            {assessment.title || 'แบบประเมินสมรรถนะสำคัญของผู้เรียน'}
            {firstDomain?.title || ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {assessment.instructions || '-'}
          </Typography>
        </Box>
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>เลขที่</TableCell>
                <TableCell>ชื่อ-สกุล</TableCell>
                <TableCell align="center">{firstDomain?.competencyLabel || 'คะแนน'}</TableCell>
                <TableCell align="center">ระดับคุณภาพ</TableCell>
                <TableCell align="center">ผล</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(assessment.students ?? []).map((student, index) => {
                const score = Number(student.scores?.[0] || 0);
                const hasAssessment = Boolean(student.name?.trim()) || score > 0;
                return (
                  <TableRow key={student.id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{student.name || '-'}</TableCell>
                    <TableCell align="center">{score}</TableCell>
                    <TableCell align="center">
                      {hasAssessment ? qualityByScore.get(score) || '-' : '-'}
                    </TableCell>
                    <TableCell align="center">
                      {hasAssessment
                        ? score >= Number(assessment.passingScore || 0)
                          ? 'ผ่าน'
                          : 'ไม่ผ่าน'
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {(assessment.domains?.length ?? 0) > 1 ? (
          <Typography variant="caption" color="text.secondary">
            มีทั้งหมด {assessment.domains.length} ด้าน โดย PDF จะแยกด้านละ 1 หน้า
          </Typography>
        ) : null}
      </Box>
    );
  }
  if (templateType === 'behavior_observation') {
    const observation = content as unknown as BehaviorObservationContent;
    const behaviors = observation.behaviors ?? [];
    return (
      <Box sx={{ gap: 2, display: 'grid' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6">{observation.title || 'แบบสังเกตพฤติกรรม'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {observation.instructions || '-'}
          </Typography>
        </Box>
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ที่</TableCell>
                <TableCell>ชื่อ-สกุล</TableCell>
                {behaviors.map((behavior) => (
                  <TableCell key={behavior.id} align="center">
                    {behavior.title}
                  </TableCell>
                ))}
                <TableCell align="center">ผล</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(observation.students ?? []).map((student, index) => {
                const observedCount = (student.observations ?? []).filter(Boolean).length;
                const hasAssessment = Boolean(student.name?.trim()) || observedCount > 0;
                return (
                  <TableRow key={student.id || index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{student.name || '-'}</TableCell>
                    {behaviors.map((behavior, behaviorIndex) => (
                      <TableCell key={behavior.id} align="center">
                        {student.observations?.[behaviorIndex] ? '✓' : '-'}
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      {hasAssessment
                        ? observedCount >= Number(observation.passingMinimum || 0)
                          ? 'ผ่าน'
                          : 'ไม่ผ่าน'
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="body2">เกณฑ์การประเมิน: {observation.passingNote || '-'}</Typography>
      </Box>
    );
  }
  if (templateType === 'reflection')
    return (
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        <Typography variant="subtitle2">๑. ผลการจัดการเรียนรู้</Typography>
        <Typography color="text.secondary">
          นักเรียนจำนวน {String(content.studentCount ?? '-')} คน · ผ่าน{' '}
          {String(content.passedCount ?? '-')} คน ({String(content.passedPercentage ?? '-')}%) ·
          ไม่ผ่าน {String(content.notPassedCount ?? '-')} คน (
          {String(content.notPassedPercentage ?? '-')}%)
        </Typography>
        {[
          ['ผลด้านความรู้ (K)', content.knowledgeResult],
          ['ผลด้านทักษะ/กระบวนการ (P)', content.processResult],
          ['ผลด้านคุณลักษณะ (A)', content.attitudeResult],
          ['๒. ปัญหา/อุปสรรค', content.problems],
          ['๓. แนวทางแก้ไข/ข้อเสนอแนะ', content.solutions],
        ].map(([label, detail]) => (
          <Box key={String(label)}>
            <Typography variant="subtitle2">{String(label)}</Typography>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {String(detail || 'เว้นไว้สำหรับบันทึกหลังการสอน')}
            </Typography>
          </Box>
        ))}
        {(
          (content.sections ?? []) as Array<{
            id: string;
            title: string;
            placeholder?: string;
          }>
        ).map((section, index) => (
          <Box key={section.id}>
            <Typography variant="subtitle2">
              {index + 1}. {section.title}
            </Typography>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {section.placeholder || 'เว้นไว้สำหรับบันทึกหลังการสอน'}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  if (templateType === 'learning_content')
    return (
      <Box component="ol" sx={{ m: 0, pl: 3 }}>
        {((content.topics ?? []) as Array<{ id: string; title: string; description?: string }>).map(
          (topic) => (
            <li key={topic.id}>
              <Typography variant="subtitle2">{topic.title}</Typography>
              <Typography color="text.secondary">{topic.description}</Typography>
            </li>
          )
        )}
      </Box>
    );
  if (templateType === 'essential_content')
    return (
      <Box>
        <Typography sx={{ whiteSpace: 'pre-line' }}>
          {String(content.content || 'ยังไม่มีเนื้อหา')}
        </Typography>
        <Box sx={{ mt: 2, gap: 0.75, display: 'flex', flexWrap: 'wrap' }}>
          {((content.keyConcepts ?? []) as string[]).map((item) => (
            <Chip key={item} size="small" label={item} />
          ))}
        </Box>
      </Box>
    );
  if (templateType === 'media') {
    const items = (content.items as Array<Record<string, unknown>> | undefined) ?? [content];
    return (
      <Box sx={{ gap: 1, display: 'grid' }}>
        {items.map((item, index) => (
          <Box
            key={String(item.id ?? index)}
            sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            <Typography variant="subtitle2">
              {index + 1}. {String(item.title || 'ยังไม่ระบุชื่อสื่อ')}
            </Typography>
            {item.description ? (
              <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {String(item.description)}
              </Typography>
            ) : null}
            {item.usageInstructions ? (
              <Typography variant="body2">วิธีใช้: {String(item.usageInstructions)}</Typography>
            ) : null}
            {item.url ? (
              <Typography variant="body2" color="primary.main" sx={{ overflowWrap: 'anywhere' }}>
                {String(item.url)}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Box>
    );
  }
  return (
    <Box sx={{ gap: 1, display: 'grid' }}>
      {Object.entries(content)
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([key, value]) => (
          <Box key={key}>
            <Typography variant="caption" color="text.secondary">
              {key}
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-line' }}>{String(value)}</Typography>
          </Box>
        ))}
    </Box>
  );
}
