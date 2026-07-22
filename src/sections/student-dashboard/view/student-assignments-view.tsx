'use client';

import type { SubmissionStatus } from '../student-dashboard-actions';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import {
  HeroStat,
  EmptyCard,
  HeroStats,
  isSubmitted,
  SectionHeading,
  StudentPageState,
  StudentPageScaffold,
  useStudentDashboard,
} from './student-dashboard-shared';

// ----------------------------------------------------------------------

const STATUS_CONFIG = {
  submitted: { label: 'ส่งแล้ว', color: 'success' as const },
  late: { label: 'ส่งล่าช้า', color: 'warning' as const },
  not_submitted: { label: 'ยังไม่ส่ง', color: 'error' as const },
  absent: { label: 'ขาดเรียน', color: 'error' as const },
  sick_leave: { label: 'ลาป่วย', color: 'info' as const },
  pending_review: { label: 'รอตรวจ', color: 'warning' as const },
} satisfies Record<
  SubmissionStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' }
>;

export function StudentAssignmentsView() {
  const { data, isLoading, isError, refetch } = useStudentDashboard('assignments');

  const overview = useMemo(() => {
    const assignments =
      data?.subjects.flatMap((item) =>
        item.assignments.map((assignment) => ({ ...assignment, subject: item.subject }))
      ) ?? [];
    const submitted = assignments.filter((assignment) => isSubmitted(assignment.status)).length;
    const totalScore = assignments.reduce(
      (total, assignment) => total + (assignment.score ?? 0),
      0
    );
    const totalFullScore = assignments
      .filter((assignment) => assignment.score !== null)
      .reduce((total, assignment) => total + assignment.full_score, 0);

    return {
      assignments,
      submitted,
      pending: assignments.length - submitted,
      progress: assignments.length ? (submitted / assignments.length) * 100 : 0,
      scorePercent: totalFullScore ? (totalScore / totalFullScore) * 100 : 0,
    };
  }, [data]);

  if (isLoading || isError || !data) {
    return <StudentPageState isLoading={isLoading} isError={isError || !data} onRetry={refetch} />;
  }

  return (
    <StudentPageScaffold
      data={data}
      section="assignments"
      stats={
        <HeroStats>
          <HeroStat icon="solar:list-bold" label="งานทั้งหมด" value={overview.assignments.length} />
          <HeroStat icon="solar:check-circle-bold" label="ส่งแล้ว" value={overview.submitted} />
          <HeroStat icon="solar:clock-circle-bold" label="ยังไม่ส่ง" value={overview.pending} />
        </HeroStats>
      }
    >
      <Box sx={{ mb: 3 }}>
        <SubmissionOverview
          total={overview.assignments.length}
          submitted={overview.submitted}
          pending={overview.pending}
          progress={overview.progress}
          scorePercent={overview.scorePercent}
        />
      </Box>

      <SectionHeading
        icon="solar:list-bold"
        title="การส่งงาน"
        subtitle="ติดตามงาน สถานะการส่ง และคะแนนของแต่ละรายวิชา"
      />

      {overview.assignments.length ? (
        <Stack spacing={1.5}>
          {overview.assignments.map((assignment) => {
            const status = STATUS_CONFIG[assignment.status];
            const overdue =
              !!assignment.due_at &&
              new Date(assignment.due_at).getTime() < new Date(data.generated_at).getTime() &&
              !isSubmitted(assignment.status);
            return (
              <Card
                key={assignment.id}
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  gap: 2,
                  display: 'flex',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    display: 'grid',
                    flexShrink: 0,
                    borderRadius: 1.5,
                    placeItems: 'center',
                    color: status.color === 'error' ? 'error.main' : 'primary.main',
                    bgcolor: status.color === 'error' ? 'error.lighter' : 'primary.lighter',
                  }}
                >
                  <Iconify
                    icon={
                      status.color === 'error'
                        ? 'solar:danger-triangle-bold'
                        : 'solar:check-circle-bold'
                    }
                  />
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Typography variant="subtitle1">{assignment.title}</Typography>
                    <Label variant="soft" color={status.color}>
                      {status.label}
                    </Label>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {assignment.subject.code && `${assignment.subject.code} · `}
                    {assignment.subject.name}
                  </Typography>
                  {assignment.due_at && (
                    <Typography
                      variant="caption"
                      sx={{
                        gap: 0.5,
                        mt: 0.75,
                        display: 'flex',
                        alignItems: 'center',
                        color: overdue ? 'error.main' : 'text.secondary',
                        fontWeight: overdue ? 700 : 500,
                      }}
                    >
                      <Iconify icon="solar:clock-circle-bold" width={16} />
                      {overdue ? 'เลยกำหนดส่ง' : 'กำหนดส่ง'}{' '}
                      {formatSubmissionDeadline(assignment.due_at)}
                    </Typography>
                  )}
                  {assignment.description && (
                    <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: 'pre-line' }}>
                      {assignment.description}
                    </Typography>
                  )}
                  {!!assignment.attachments.length && (
                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      flexWrap="wrap"
                      sx={{ mt: 1.25 }}
                    >
                      {assignment.attachments.map((file) => (
                        <Link
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="none"
                          sx={{
                            gap: 0.5,
                            px: 1,
                            py: 0.5,
                            display: 'inline-flex',
                            borderRadius: 1,
                            alignItems: 'center',
                            typography: 'caption',
                            color: 'primary.main',
                            bgcolor: 'primary.lighter',
                          }}
                        >
                          <Iconify
                            icon={
                              file.mime_type.startsWith('image/')
                                ? 'solar:gallery-wide-bold'
                                : 'solar:file-text-bold'
                            }
                            width={16}
                          />
                          {file.file_name}
                        </Link>
                      ))}
                    </Stack>
                  )}
                  {assignment.feedback && (
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}
                    >
                      ความคิดเห็นจากครู: {assignment.feedback}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ minWidth: 112, textAlign: { sm: 'right' } }}>
                  <Typography variant="h6">
                    {assignment.score === null ? '–' : assignment.score}
                    <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                      {' '}
                      / {assignment.full_score}
                    </Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    คะแนน
                  </Typography>
                </Box>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <EmptyCard text="ยังไม่มีงานที่ได้รับมอบหมาย" />
      )}
    </StudentPageScaffold>
  );
}

// ----------------------------------------------------------------------

function SubmissionOverview({
  total,
  submitted,
  pending,
  progress,
  scorePercent,
}: {
  total: number;
  submitted: number;
  pending: number;
  progress: number;
  scorePercent: number;
}) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
      <SectionHeading
        compact
        icon="solar:check-circle-bold"
        title="ภาพรวมการส่งงาน"
        subtitle="ความคืบหน้าของงานทั้งหมด"
      />
      <Box
        sx={{ p: 2.5, mb: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'background.neutral' }}
      >
        <Typography variant="h2" sx={{ color: 'primary.main' }}>
          {Math.round(progress)}%
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          ส่งแล้ว {submitted} จาก {total} งาน
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 2, height: 9, borderRadius: 5 }}
        />
      </Box>
      <Stack spacing={1.5} divider={<Divider flexItem />}>
        <OverviewRow label="ส่งแล้ว / รอตรวจ" value={`${submitted} งาน`} color="success.main" />
        <OverviewRow label="ยังไม่ส่ง / ขาด / ลา" value={`${pending} งาน`} color="error.main" />
        <OverviewRow
          label="คะแนนเฉลี่ยจากงานที่ตรวจแล้ว"
          value={`${Math.round(scorePercent)}%`}
          color="info.main"
        />
      </Stack>
    </Card>
  );
}

function OverviewRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ color }}>
        {value}
      </Typography>
    </Stack>
  );
}

function formatSubmissionDeadline(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
