'use client';

import type { LessonPlan, LessonPlanStatus } from '../lesson-plan-actions';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { RemixIcon } from 'src/components/remix-icon';

import { richTextToPlainText, assessmentToPlainText } from '../lesson-plan-content';
import {
  getLessonPlan,
  updateLessonPlanStatus,
  listLessonPlansForReview,
} from '../lesson-plan-actions';

// ----------------------------------------------------------------------

const STATUS_LABEL: Record<LessonPlanStatus, string> = {
  draft: 'ฉบับร่าง',
  submitted: 'รอตรวจสอบ',
  revision: 'ส่งกลับแก้ไข',
  approved: 'อนุมัติแล้ว',
  archived: 'เก็บถาวร',
};

function personName(person: LessonPlan['teacher']) {
  return (
    [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.username || '-'
  );
}

export function LessonPlanReviewListView() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'revision' | null>(null);
  const [note, setNote] = useState('');

  const plansQuery = useQuery({
    queryKey: ['lesson-plans', 'review'],
    queryFn: listLessonPlansForReview,
  });
  const detailQuery = useQuery({
    queryKey: ['lesson-plan', selectedId],
    queryFn: () => getLessonPlan(selectedId!),
    enabled: Boolean(selectedId),
  });
  const reviewMutation = useMutation({
    mutationFn: () => updateLessonPlanStatus(selectedId!, reviewAction!, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lesson-plans'] });
      setReviewAction(null);
      setSelectedId(null);
      setNote('');
    },
  });

  const plans = plansQuery.data?.lessonPlans ?? [];
  const canManage = plansQuery.data?.canManage ?? false;
  const waitingCount = plans.filter((plan) => plan.status === 'submitted').length;
  const detail = detailQuery.data;

  return (
    <Container maxWidth="xl" sx={{ pb: 7 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          ตรวจแผนการสอน
        </Typography>
        <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
          ตรวจเนื้อหา จำนวนคาบ และความสอดคล้องกับหลักสูตรก่อนนำไปจัดตารางสอน
        </Typography>
      </Box>

      <Box
        sx={{
          gap: 2,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        {[
          ['รอตรวจสอบ', waitingCount, 'info'],
          ['ส่งกลับแก้ไข', plans.filter((plan) => plan.status === 'revision').length, 'warning'],
          ['อนุมัติแล้ว', plans.filter((plan) => plan.status === 'approved').length, 'success'],
        ].map(([label, value, color]) => (
          <Card key={String(label)} variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5, color: `${color}.main` }}>
              {value}
            </Typography>
          </Card>
        ))}
      </Box>

      {plansQuery.isError || reviewMutation.isError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {plansQuery.error?.message ?? reviewMutation.error?.message}
        </Alert>
      ) : null}
      {!plansQuery.isLoading && !canManage ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          บัญชีนี้ดูแผนได้อย่างเดียว ผู้ที่ได้รับสิทธิ์จัดการจึงจะอนุมัติหรือส่งกลับได้
        </Alert>
      ) : null}
      {plansQuery.isLoading ? <LinearProgress sx={{ mb: 2 }} /> : null}

      <Card variant="outlined">
        {plans.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <RemixIcon
              icon="solar:clipboard-check-bold-duotone"
              width={46}
              sx={{ color: 'text.disabled' }}
            />
            <Typography variant="h6" sx={{ mt: 1.5 }}>
              ยังไม่มีแผนที่ส่งมาตรวจ
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
            {plans.map((plan) => (
              <Box
                key={plan.id}
                sx={{
                  p: 2.5,
                  gap: 2,
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle1">{plan.title}</Typography>
                    <Chip
                      size="small"
                      label={STATUS_LABEL[plan.status]}
                      color={
                        plan.status === 'approved'
                          ? 'success'
                          : plan.status === 'revision'
                            ? 'warning'
                            : 'info'
                      }
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    {personName(plan.teacher)} · {plan.teacher_assignment?.subject?.name} ·{' '}
                    {plan.teacher_assignment?.classroom?.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    หน่วยที่ {plan.unit_number} {plan.unit_name} · {plan.duration_periods} คาบ ·
                    เวอร์ชัน {plan.version_number}
                  </Typography>
                </Box>
                <Button
                  variant={plan.status === 'submitted' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedId(plan.id)}
                >
                  {plan.status === 'submitted' ? 'ตรวจแผน' : 'ดูรายละเอียด'}
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Card>

      <Dialog
        open={Boolean(selectedId)}
        onClose={() => !reviewMutation.isPending && setSelectedId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>รายละเอียดแผนการสอน</DialogTitle>
        <DialogContent dividers>
          {detailQuery.isLoading ? <LinearProgress /> : null}
          {detail ? (
            <Box sx={{ gap: 2.5, display: 'grid' }}>
              <Box>
                <Typography variant="h5">{detail.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ครู {personName(detail.teacher)} · {detail.teacher_assignment?.subject?.name} ·{' '}
                  {detail.teacher_assignment?.classroom?.name}
                </Typography>
              </Box>
              <Alert severity="info">
                หน่วยที่ {detail.unit_number}: {detail.unit_name} · ใช้ {detail.duration_periods}{' '}
                คาบ
              </Alert>
              {[
                ['มาตรฐานการเรียนรู้', detail.learning_standards],
                ['ตัวชี้วัด', detail.indicators],
                ['จุดประสงค์การเรียนรู้', detail.learning_objectives],
                ['สาระสำคัญ', detail.essential_content],
                ['สมรรถนะสำคัญของผู้เรียน', detail.learner_competencies],
                ['คุณลักษณะอันพึงประสงค์', detail.desired_characteristics],
                ['คำถามหลัก (Big Question)', detail.guiding_questions],
                ['กิจกรรมการเรียนรู้', detail.learning_activities],
                ['สื่อและแหล่งเรียนรู้', detail.learning_media],
                ['การวัดและประเมินผล', assessmentToPlainText(detail.assessment)],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant="subtitle2">{label}</Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      whiteSpace: 'pre-wrap',
                      color: value ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {richTextToPlainText(value) || 'ไม่ได้ระบุ'}
                  </Typography>
                </Box>
              ))}
              {reviewAction ? (
                <TextField
                  autoFocus
                  multiline
                  minRows={3}
                  required={reviewAction === 'revision'}
                  label={
                    reviewAction === 'revision'
                      ? 'สิ่งที่ต้องแก้ไข'
                      : 'หมายเหตุการอนุมัติ (ไม่บังคับ)'
                  }
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setSelectedId(null);
              setReviewAction(null);
              setNote('');
            }}
          >
            ปิด
          </Button>
          {canManage && detail?.status === 'submitted' && !reviewAction ? (
            <>
              <Button color="warning" onClick={() => setReviewAction('revision')}>
                ส่งกลับแก้ไข
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => setReviewAction('approve')}
              >
                อนุมัติแผน
              </Button>
            </>
          ) : null}
          {reviewAction ? (
            <Button
              variant="contained"
              color={reviewAction === 'approve' ? 'success' : 'warning'}
              disabled={reviewAction === 'revision' && !note.trim()}
              loading={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate()}
            >
              ยืนยัน{reviewAction === 'approve' ? 'อนุมัติ' : 'ส่งกลับ'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
