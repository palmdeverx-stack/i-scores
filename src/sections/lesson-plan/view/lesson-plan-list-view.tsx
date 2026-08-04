'use client';

import type { LessonPlan, LessonPlanInput, LessonPlanStatus } from '../lesson-plan-actions';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';

import { useAuthContext } from 'src/auth/hooks';

import {
  copyLessonPlan,
  listLessonPlans,
  deleteLessonPlan,
  updateLessonPlanStatus,
} from '../lesson-plan-actions';

// ----------------------------------------------------------------------

const LessonPlanPdfDialog = dynamic(() => import('../components/lesson-plan-pdf-dialog'), {
  ssr: false,
});

// ----------------------------------------------------------------------

const STATUS_CONFIG: Record<
  LessonPlanStatus,
  { label: string; color: 'default' | 'info' | 'warning' | 'success' }
> = {
  draft: { label: 'ฉบับร่าง', color: 'default' },
  submitted: { label: 'รอตรวจสอบ', color: 'info' },
  revision: { label: 'ส่งกลับแก้ไข', color: 'warning' },
  approved: { label: 'อนุมัติแล้ว', color: 'success' },
  archived: { label: 'เก็บถาวร', color: 'default' },
};

function assignmentLabel(plan: LessonPlan) {
  const assignment = plan.teacher_assignment;
  return [
    assignment?.subject?.name,
    assignment?.classroom?.name,
    assignment?.semester?.name,
    assignment?.classroom?.academic_year?.year,
  ]
    .filter(Boolean)
    .join(' · ');
}

function toPreviewInput(plan: LessonPlan): LessonPlanInput {
  return {
    curriculumId: plan.curriculum_id,
    subjectId: plan.subject_id,
    unitId: plan.unit_id,
    gradeLevels: plan.grade_levels ?? [],
    indicatorIds: plan.indicator_ids ?? [],
    learningOutcomeIds: plan.learning_outcome_ids ?? [],
    title: plan.title,
    unitName: plan.unit_name,
    unitNumber: plan.unit_number,
    startDate: plan.start_date ?? '',
    endDate: plan.end_date ?? '',
    indicators: plan.indicators ?? '',
    assessment: plan.assessment ?? '',
    durationPeriods: plan.duration_periods,
    learningMedia: plan.learning_media ?? '',
    teacherAssignmentId: plan.teacher_assignment_id,
    essentialContent: plan.essential_content ?? '',
    learningStandards: plan.learning_standards ?? '',
    guidingQuestions: plan.guiding_questions ?? '',
    learningActivities: plan.learning_activities ?? '',
    learningObjectives: plan.learning_objectives ?? '',
    learnerCompetencies: plan.learner_competencies ?? '',
    desiredCharacteristics: plan.desired_characteristics ?? '',
  };
}

export function LessonPlanListView() {
  const { user } = useAuthContext();
  const isPersonalWorkspace = user?.is_personal_workspace === true;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'all' | LessonPlanStatus>('all');
  const [search, setSearch] = useState('');
  const [previewing, setPreviewing] = useState<LessonPlan | null>(null);
  const [submitting, setSubmitting] = useState<LessonPlan | null>(null);
  const [deleting, setDeleting] = useState<LessonPlan | null>(null);
  const previewInput = useMemo(
    () => (previewing ? toPreviewInput(previewing) : null),
    [previewing]
  );

  const plansQuery = useQuery({
    queryKey: ['lesson-plans', 'mine'],
    queryFn: () => listLessonPlans('mine'),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lesson-plans'] });
  const copyMutation = useMutation({
    mutationFn: copyLessonPlan,
    onSuccess: async () => {
      await refresh();
      toast.success('คัดลอกแผนเป็นฉบับร่างแล้ว');
    },
  });
  const submitMutation = useMutation({
    mutationFn: (id: string) => updateLessonPlanStatus(id, 'submit'),
    onSuccess: async () => {
      await refresh();
      setSubmitting(null);
      toast.success('ส่งแผนให้ฝ่ายวิชาการแล้ว');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteLessonPlan,
    onSuccess: async () => {
      await refresh();
      setDeleting(null);
      toast.success('ลบแผนฉบับร่างแล้ว');
    },
  });

  const keyword = search.trim().toLocaleLowerCase('th');
  const plans = (plansQuery.data ?? []).filter(
    (plan) =>
      (status === 'all' || plan.status === status) &&
      (!keyword ||
        [plan.title, plan.unit_name, assignmentLabel(plan)]
          .join(' ')
          .toLocaleLowerCase('th')
          .includes(keyword))
  );

  return (
    <Container maxWidth={false} sx={{ pb: 7 }}>
      <Box
        sx={{
          mb: 4,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            แผนการสอน
          </Typography>
          <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
            สร้างแผนดิจิทัล เก็บประวัติเวอร์ชัน และส่งให้ฝ่ายวิชาการตรวจสอบ
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          href={paths.teacher.lessonPlans.new}
          variant="contained"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
        >
          สร้างแผนใหม่
        </Button>
      </Box>

      {plansQuery.isError ||
      copyMutation.isError ||
      submitMutation.isError ||
      deleteMutation.isError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {plansQuery.error?.message ??
            copyMutation.error?.message ??
            submitMutation.error?.message ??
            deleteMutation.error?.message}
        </Alert>
      ) : null}

      <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="ค้นหาชื่อแผน วิชา หรือห้องเรียน"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <RemixIcon icon="solar:magnifer-linear" sx={{ mr: 1, color: 'text.disabled' }} />
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="สถานะ"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">ทุกสถานะ</MenuItem>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <MenuItem key={value} value={value}>
                {config.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {plansQuery.isLoading ? <LinearProgress sx={{ mb: 2 }} /> : null}
      {!plansQuery.isLoading && plans.length === 0 ? (
        <Card variant="outlined" sx={{ py: 9, textAlign: 'center' }}>
          <RemixIcon
            icon="solar:clipboard-text-bold-duotone"
            width={48}
            sx={{ color: 'text.disabled' }}
          />
          <Typography variant="h6" sx={{ mt: 2 }}>
            ยังไม่มีแผนการสอน
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            เริ่มจากรายวิชาและห้องเรียนที่คุณได้รับมอบหมาย
          </Typography>
        </Card>
      ) : (
        <Box
          sx={{
            gap: 2.5,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          {plans.map((plan) => {
            const statusConfig = STATUS_CONFIG[plan.status];
            const editable = ['draft', 'revision'].includes(plan.status);
            return (
              <Card
                key={plan.id}
                role="button"
                tabIndex={0}
                variant="outlined"
                aria-label={`เปิดพรีวิว ${plan.title}`}
                onClick={() => setPreviewing(plan)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setPreviewing(plan);
                  }
                }}
                sx={{
                  p: 1.5,
                  minWidth: 0,
                  display: 'flex',
                  cursor: 'pointer',
                  borderRadius: 3,
                  flexDirection: 'column',
                  transition: (theme) =>
                    theme.transitions.create(['transform', 'box-shadow', 'border-color']),
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    borderColor: 'primary.light',
                    boxShadow: (theme) => theme.customShadows.z12,
                  },
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    height: 250,
                    position: 'relative',
                    borderRadius: 2.5,
                    bgcolor: 'grey.300',
                    border: '1px solid',
                    borderColor: 'primary.lighter',
                    '&::before, &::after': {
                      left: '10%',
                      right: '10%',
                      content: '""',
                      height: 12,
                      bottom: -8,
                      position: 'absolute',
                      borderRadius: '0 0 12px 12px',
                      bgcolor: 'grey.300',
                      opacity: 0.55,
                    },
                    '&::after': { left: '15%', right: '15%', bottom: -14, opacity: 0.3 },
                  }}
                >
                  <Box
                    sx={{
                      p: 0,
                      width: '100%',
                      height: '100%',
                      display: 'grid',
                      overflow: 'hidden',
                      placeItems: 'center',
                      borderRadius: 2,
                      // border: '2px solid',
                      borderColor: 'primary.light',
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        width: '48%',
                        height: '100%',
                        overflow: 'hidden',
                        color: 'grey.800',
                        bgcolor: 'common.white',
                      }}
                    >
                      <Typography
                        sx={{
                          mb: 1,
                          fontSize: 6,
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                      >
                        {plan.title}
                      </Typography>
                      <Divider sx={{ mb: 1 }} />
                      <Typography sx={{ fontSize: 5, fontWeight: 700 }}>
                        หน่วยที่ {plan.unit_number} {plan.unit_name}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.75,
                          fontSize: 4.5,
                          lineHeight: 1.6,
                          overflow: 'hidden',
                          whiteSpace: 'pre-line',
                          display: '-webkit-box',
                          WebkitLineClamp: 12,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {plan.learning_objectives || plan.learning_standards || plan.unit_name}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ left: 0, bottom: 0, position: 'absolute' }}>
                    <Typography
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.5,
                        display: 'block',
                        color: 'common.white',
                        bgcolor: 'primary.darker',
                        borderRadius: '0 8px 0 8px',
                        typography: 'subtitle2',
                      }}
                    >
                      PDF
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ px: 1, pt: 3, pb: 1, minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {plan.title}
                  </Typography>

                  <Box sx={{ gap: 1, mt: 0.75, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                      9 ส่วน · {plan.duration_periods} คาบ · v{plan.version_number}
                    </Typography>
                    <Chip size="small" color={statusConfig.color} label={statusConfig.label} />
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.75,
                      display: 'block',
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {assignmentLabel(plan)} · หน่วยที่ {plan.unit_number}: {plan.unit_name}
                  </Typography>

                  {/* <Typography
                    variant="subtitle1"
                    sx={{
                      mt: 1.25,
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    โดย{' '}
                    <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      {teacherLabel(plan)}
                    </Box>
                  </Typography> */}

                  {plan.review_note ? (
                    <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
                      ฝ่ายวิชาการ: {plan.review_note}
                    </Alert>
                  ) : null}
                </Box>

                <Divider sx={{ my: 1 }} />
                <Box
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  sx={{ gap: 0.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
                >
                  {editable ? (
                    <Button
                      size="small"
                      component={RouterLink}
                      href={paths.teacher.lessonPlans.edit(plan.id)}
                      startIcon={<RemixIcon icon="solar:pen-linear" />}
                    >
                      แก้ไข
                    </Button>
                  ) : null}
                  {editable && !isPersonalWorkspace ? (
                    <Button size="small" variant="contained" onClick={() => setSubmitting(plan)}>
                      ส่งตรวจ
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    color="inherit"
                    loading={copyMutation.isPending}
                    onClick={() => copyMutation.mutate(plan.id)}
                    startIcon={<RemixIcon icon="solar:copy-linear" />}
                  >
                    คัดลอก
                  </Button>
                  {plan.status === 'draft' ? (
                    <Button
                      size="small"
                      color="error"
                      sx={{ ml: 'auto', minWidth: 60 }}
                      onClick={() => setDeleting(plan)}
                    >
                      ลบ
                    </Button>
                  ) : null}
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {previewing && previewInput ? (
        <LessonPlanPdfDialog
          open
          plan={previewInput}
          assignment={previewing.teacher_assignment ?? undefined}
          version={previewing.version_number}
          onClose={() => setPreviewing(null)}
        />
      ) : null}

      <Dialog
        open={!isPersonalWorkspace && Boolean(submitting)}
        onClose={() => setSubmitting(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ส่งแผนให้ฝ่ายวิชาการ</DialogTitle>
        <DialogContent>
          <Typography>
            ยืนยันส่ง “{submitting?.title}” เพื่อตรวจสอบ เมื่อส่งแล้วจะแก้ไขไม่ได้จนกว่าจะถูกส่งกลับ
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setSubmitting(null)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            loading={submitMutation.isPending}
            onClick={() => submitting && submitMutation.mutate(submitting.id)}
          >
            ยืนยันส่ง
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} fullWidth maxWidth="xs">
        <DialogTitle>ลบแผนฉบับร่าง</DialogTitle>
        <DialogContent>
          <Typography>
            ต้องการลบ “{deleting?.title}” หรือไม่? ประวัติเวอร์ชันของแผนนี้จะถูกลบด้วย
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeleting(null)}>
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
          >
            ลบแผน
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
