'use client';

import type { TemplateType, RubricContent } from '../types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { TEMPLATE_TYPE_LABELS } from '../constants';

export function TemplatePreview({
  templateType,
  content,
}: {
  templateType: TemplateType;
  content: Record<string, unknown>;
}) {
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
  if (templateType === 'learning_activity')
    return (
      <Box sx={{ gap: 1.5, display: 'grid' }}>
        <Typography variant="h6">{String(content.activityName || 'ชื่อกิจกรรม')}</Typography>
        <Chip
          size="small"
          sx={{ width: 'fit-content' }}
          label={`${String(content.phase || 'learning')} · ${String(content.durationMinutes || 0)} นาที`}
        />
        {[
          ['teacherActions', 'สิ่งที่ครูทำ'],
          ['studentActions', 'สิ่งที่นักเรียนทำ'],
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
          (content.questions ?? []) as Array<{ id: string; question: string; bloomLevel?: string }>
        ).map((item) => (
          <Box component="li" key={item.id} sx={{ mb: 1.5 }}>
            <Typography>{item.question || 'คำถาม'}</Typography>
            {item.bloomLevel ? <Chip size="small" variant="soft" label={item.bloomLevel} /> : null}
          </Box>
        ))}
      </Box>
    );
  if (templateType === 'lesson_plan' || templateType === 'reflection')
    return (
      <Box sx={{ gap: 1, display: 'grid' }}>
        {(
          (content.sections ?? []) as Array<{
            id: string;
            title: string;
            sectionType?: TemplateType;
            required?: boolean;
          }>
        ).map((section, index) => (
          <Box
            key={section.id}
            sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            <Typography variant="subtitle2">
              {index + 1}. {section.title || 'ยังไม่ระบุหัวข้อ'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {section.sectionType ? TEMPLATE_TYPE_LABELS[section.sectionType] : ''}
              {section.required ? ' · บังคับ' : ''}
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
