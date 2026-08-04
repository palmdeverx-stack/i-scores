'use client';

import type { TemplateAIAction, TemplateAIResult } from '../types/ai.types';
import type {
  TemplateType,
  TemplateContent,
  TemplateMetadata,
} from 'src/features/templates/types';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { GRADE_LEVELS, TEMPLATE_TYPES } from 'src/features/templates/constants';
import { TemplatePreview } from 'src/features/templates/components/template-preview';

import { RemixIcon } from 'src/components/remix-icon';

import { requestTemplateAIGeneration } from '../template-ai-actions';

type SubjectOption = {
  id: string;
  code: string | null;
  name: string;
  learning_area: string | null;
  scope: 'system' | 'personal' | 'school' | 'public';
};
type IndicatorOption = { id: string; subject_id: string; code: string; description: string };

const SUBJECT_SCOPE_LABELS: Record<SubjectOption['scope'], string> = {
  system: 'ระบบ',
  personal: 'ส่วนตัว',
  school: 'โรงเรียน',
  public: 'สาธารณะ',
};

export function TemplateAIDialog({
  open,
  onClose,
  templateId,
  initial,
  subjects,
  indicators,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  templateId?: string;
  initial: {
    name: string;
    templateType: TemplateType;
    subjectId?: string | null;
    gradeLevels: string[];
    teachingMethod?: string;
    durationMinutes?: number;
    indicatorIds: string[];
    content: TemplateContent;
    tags: string[];
    metadata: TemplateMetadata;
  };
  subjects: SubjectOption[];
  indicators: IndicatorOption[];
  onApply: (result: TemplateAIResult, templateType: TemplateType, subjectId?: string) => void;
}) {
  const [templateType, setTemplateType] = useState(initial.templateType);
  const [action, setAction] = useState<TemplateAIAction>('generate');
  const [topic, setTopic] = useState(initial.name);
  const [subjectId, setSubjectId] = useState(initial.subjectId ?? '');
  const [gradeLevels, setGradeLevels] = useState(initial.gradeLevels);
  const [indicatorIds, setIndicatorIds] = useState(initial.indicatorIds);
  const [teachingMethod, setTeachingMethod] = useState(initial.teachingMethod ?? '');
  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes ?? 50);
  const [classroomContext, setClassroomContext] = useState('');
  const [learnerCount, setLearnerCount] = useState<number | ''>('');
  const [availableResources, setAvailableResources] = useState('');
  const [objectives, setObjectives] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [section, setSection] = useState('');
  const [language, setLanguage] = useState<'th' | 'en'>('th');
  const [detailLevel, setDetailLevel] = useState<'concise' | 'standard' | 'detailed'>('standard');
  const [result, setResult] = useState<TemplateAIResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setTemplateType(initial.templateType);
    setAction(templateId ? 'improve' : 'generate');
    setTopic(initial.name);
    setSubjectId(initial.subjectId ?? '');
    setGradeLevels(initial.gradeLevels);
    setIndicatorIds(initial.indicatorIds);
    setTeachingMethod(initial.teachingMethod ?? '');
    setDurationMinutes(initial.durationMinutes ?? 50);
    setClassroomContext('');
    setLearnerCount('');
    setAvailableResources('');
    setObjectives('');
    setAdditionalInstructions('');
    setSection('');
    setLanguage('th');
    setDetailLevel('standard');
    setResult(null);
  }, [initial, open, templateId]);

  const mutation = useMutation({
    mutationFn: (nextAction: TemplateAIAction) =>
      requestTemplateAIGeneration({
        action: nextAction,
        templateType,
        topic: topic.trim(),
        subjectId: subjectId || undefined,
        gradeLevels,
        indicatorIds,
        teachingMethod: teachingMethod.trim() || undefined,
        durationMinutes: durationMinutes || undefined,
        classroomContext: classroomContext.trim() || undefined,
        learnerCount: learnerCount || undefined,
        availableResources: availableResources.split(',').map((item) => item.trim()).filter(Boolean),
        objectives: objectives.split('\n').map((item) => item.trim()).filter(Boolean),
        additionalInstructions: additionalInstructions.trim() || undefined,
        section: section.trim() || undefined,
        language,
        detailLevel,
        existingTemplateId: templateId,
        existingContent: result?.content ?? initial.content,
        existingTags: result?.tags ?? initial.tags,
        existingMetadata: result?.metadata ?? initial.metadata,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: setResult,
  });

  const availableIndicators = indicators.filter(
    (indicator) => !subjectId || indicator.subject_id === subjectId
  );
  const selectedIndicators = availableIndicators.filter((indicator) => indicatorIds.includes(indicator.id));

  const generate = (nextAction = action) => {
    if (!topic.trim()) return;
    setAction(nextAction);
    mutation.mutate(nextAction);
  };

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RemixIcon icon="solar:magic-stick-3-linear" /> สร้าง Template ด้วย AI
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          ห้ามกรอกชื่อ เลขประจำตัว เบอร์โทร ข้อมูลสุขภาพ หรือข้อมูลรายบุคคลของนักเรียน
        </Alert>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: result ? '1fr 1fr' : '1fr' } }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField select label="ประเภท Template" value={templateType} onChange={(event) => setTemplateType(event.target.value as TemplateType)}>
                {TEMPLATE_TYPES.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </TextField>
              <TextField select label="คำสั่ง" value={action} onChange={(event) => setAction(event.target.value as TemplateAIAction)}>
                <MenuItem value="generate">สร้างใหม่</MenuItem>
                <MenuItem value="improve">ปรับปรุง</MenuItem>
                <MenuItem value="rewrite">เรียบเรียงใหม่</MenuItem>
                <MenuItem value="shorten">ปรับให้สั้นลง</MenuItem>
                <MenuItem value="expand">เพิ่มรายละเอียด</MenuItem>
                <MenuItem value="regenerate">สร้างส่วนนี้ใหม่</MenuItem>
                <MenuItem value="suggest_tags">แนะนำ Tags</MenuItem>
                <MenuItem value="suggest_metadata">แนะนำ Metadata</MenuItem>
              </TextField>
              <TextField required label="หัวข้อหรือเรื่อง" value={topic} onChange={(event) => setTopic(event.target.value)} inputProps={{ maxLength: 500 }} />
              <TextField select label="รายวิชา" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setIndicatorIds([]); }}>
                <MenuItem value="">ไม่ระบุ</MenuItem>
                {subjects.map((subject) => <MenuItem key={subject.id} value={subject.id}>{subject.code ? `${subject.code} · ` : ''}{subject.name} ({SUBJECT_SCOPE_LABELS[subject.scope]})</MenuItem>)}
              </TextField>
            </Box>
            <Autocomplete multiple options={GRADE_LEVELS} value={gradeLevels} onChange={(_, value) => setGradeLevels(value)} renderInput={(params) => <TextField {...params} label="ระดับชั้น" />} />
            <Autocomplete
              multiple
              options={availableIndicators}
              value={selectedIndicators}
              getOptionLabel={(option) => `${option.code} · ${option.description}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, value) => setIndicatorIds(value.map((item) => item.id))}
              renderInput={(params) => <TextField {...params} label="ตัวชี้วัด" helperText="ระบบส่งเฉพาะ ID และดึงข้อความจริงจากฐานข้อมูล" />}
            />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="รูปแบบการสอน" value={teachingMethod} onChange={(event) => setTeachingMethod(event.target.value)} />
              <TextField type="number" label="ระยะเวลา (นาที)" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} inputProps={{ min: 1, max: 600 }} />
              <TextField type="number" label="จำนวนผู้เรียนโดยประมาณ" value={learnerCount} onChange={(event) => setLearnerCount(event.target.value ? Number(event.target.value) : '')} inputProps={{ min: 1, max: 1000 }} />
              <TextField label="อุปกรณ์หรือสื่อที่มี" value={availableResources} onChange={(event) => setAvailableResources(event.target.value)} helperText="คั่นแต่ละรายการด้วยจุลภาค" />
              <TextField select label="ภาษา" value={language} onChange={(event) => setLanguage(event.target.value as 'th' | 'en')}><MenuItem value="th">ไทย</MenuItem><MenuItem value="en">English</MenuItem></TextField>
              <TextField select label="ระดับรายละเอียด" value={detailLevel} onChange={(event) => setDetailLevel(event.target.value as typeof detailLevel)}><MenuItem value="concise">กระชับ</MenuItem><MenuItem value="standard">มาตรฐาน</MenuItem><MenuItem value="detailed">ละเอียด</MenuItem></TextField>
            </Box>
            <TextField multiline minRows={2} label="จุดประสงค์ (บรรทัดละข้อ)" value={objectives} onChange={(event) => setObjectives(event.target.value)} />
            <TextField multiline minRows={2} label="บริบทห้องเรียนแบบข้อมูลรวม" value={classroomContext} onChange={(event) => setClassroomContext(event.target.value)} inputProps={{ maxLength: 2000 }} />
            <TextField multiline minRows={2} label="ความต้องการเพิ่มเติม" value={additionalInstructions} onChange={(event) => setAdditionalInstructions(event.target.value)} inputProps={{ maxLength: 2000 }} />
            <TextField label="ส่วนที่ต้องการสร้างใหม่ (ถ้ามี)" value={section} onChange={(event) => setSection(event.target.value)} inputProps={{ maxLength: 100 }} helperText="เช่น กิจกรรม, เกณฑ์ Rubric หรือคำอธิบายระดับคะแนน" />
            {mutation.isError ? <Alert severity="error">{mutation.error.message}</Alert> : null}
          </Box>
          {result ? (
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="h6">Preview</Typography>
                <Chip color="secondary" size="small" label="สร้างด้วย AI" />
              </Box>
              <Typography variant="subtitle1">{result.name}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>{result.description}</Typography>
              <TemplatePreview templateType={templateType} content={result.content as Record<string, unknown>} />
              {result.warnings.length ? <Alert severity="warning" sx={{ mt: 2 }}>{result.warnings.join(' · ')}</Alert> : null}
              <Alert severity="info" sx={{ mt: 2 }}>เนื้อหานี้สร้างโดย AI กรุณาตรวจสอบความถูกต้องก่อนนำไปใช้</Alert>
              <Typography variant="caption" color="text.secondary">สิทธิ์คงเหลือ {result.quota.remaining} ครั้ง</Typography>
            </Box>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap' }}>
        <Button color="inherit" onClick={onClose} disabled={mutation.isPending}>ยกเลิก</Button>
        {result ? <>
          <Button onClick={() => generate('shorten')} disabled={mutation.isPending}>ปรับให้สั้นลง</Button>
          <Button onClick={() => generate('expand')} disabled={mutation.isPending}>เพิ่มรายละเอียด</Button>
          <Button onClick={() => generate('regenerate')} disabled={mutation.isPending}>สร้างใหม่</Button>
          <Button variant="contained" onClick={() => onApply(result, templateType, subjectId || undefined)}>นำไปใช้</Button>
        </> : <Button variant="contained" loading={mutation.isPending} disabled={!topic.trim()} onClick={() => generate()}>สร้าง Preview</Button>}
      </DialogActions>
    </Dialog>
  );
}
