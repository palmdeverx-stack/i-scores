'use client';

import { varAlpha } from 'minimal-shared/utils';
import { useQuery } from '@tanstack/react-query';
import { memo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getTeachingScheduleStatus } from 'src/utils/teaching-schedule';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { ScoreReportExportButton } from './score-report-export-button';
import { getRoster, getSchedules } from '../../teacher-assignment-actions';
import { TeacherSubjectImageDialog } from '../teacher-subject-image-dialog';

type Props = {
  teacherAssignmentId: string;
};

export const TeacherAssignmentDetailHeader = memo(function TeacherAssignmentDetailHeader({
  teacherAssignmentId,
}: Props) {
  const { user } = useAuthContext();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const isTeacher = user?.role === 'teacher';
  const backPath = isTeacher ? paths.teacher.assignments : paths.admin.teacherAssignment.root;
  const assignmentNewPath = isTeacher
    ? paths.teacher.assignmentNew(teacherAssignmentId)
    : paths.admin.teacherAssignment.assignmentNew(teacherAssignmentId);

  const { data: roster, isLoading } = useQuery({
    queryKey: ['roster', teacherAssignmentId],
    queryFn: () => getRoster(teacherAssignmentId),
  });
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', teacherAssignmentId],
    queryFn: () => getSchedules(teacherAssignmentId),
  });

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const scheduleStatus =
    currentTime && schedules ? getTeachingScheduleStatus(schedules, currentTime) : null;
  const activeSchedule =
    roster?.semesterIsActive && scheduleStatus?.active ? scheduleStatus.active : null;
  const statusLabel = !roster?.semesterIsActive
    ? 'ภาคเรียนสิ้นสุด'
    : activeSchedule
      ? `กำลังสอน · ${activeSchedule.start_time.slice(0, 5)}–${activeSchedule.end_time.slice(0, 5)} น.`
      : scheduleStatus?.next
        ? `คาบถัดไปวันนี้ · ${scheduleStatus.next.start_time.slice(0, 5)} น.`
        : scheduleStatus?.hasScheduleToday
          ? 'ขณะนี้ไม่มีคาบสอน'
          : 'วันนี้ไม่มีคาบสอน';

  return (
    <>
      <Button
        component={RouterLink}
        href={backPath}
        color="inherit"
        startIcon={<Iconify icon="solar:reply-bold" />}
        sx={{ mb: 2 }}
      >
        กลับหน้าครูประจำวิชา
      </Button>

      <Card
        sx={{
          mb: 3,
          p: 2,
          color: 'common.white',
          overflow: 'hidden',
          position: 'relative',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.main} 100%)`,
          '&::after': {
            width: 240,
            height: 240,
            content: '""',
            borderRadius: '50%',
            position: 'absolute',
            right: -90,
            bottom: -170,
            bgcolor: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
          },
        }}
      >
        <Box
          sx={{
            zIndex: 1,
            gap: 2.5,
            display: 'flex',
            position: 'relative',
            alignItems: { xs: 'flex-start' },
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Avatar
            src={roster?.subjectImageUrl ?? undefined}
            variant="rounded"
            sx={{ width: 140, height: 140, color: 'primary.darker', bgcolor: 'common.white' }}
          >
            <Iconify icon="solar:notes-bold-duotone" width={36} />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" sx={{ opacity: 0.72 }}>
              รายละเอียดการสอน
            </Typography>
            <Typography component="h1" variant="h3">
              {isLoading ? (
                <Skeleton width={240} />
              ) : (
                `${roster?.subjectCode ? `${roster.subjectCode} · ` : ''}${roster?.subjectName ?? 'รายวิชา'}`
              )}
            </Typography>
            <Box
              sx={{
                gap: 1.5,
                mt: 1,
                display: 'flex',
                flexWrap: 'wrap',
                color: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.78),
              }}
            >
              <Typography variant="body1">ห้อง {roster?.classroomName ?? '-'}</Typography>
              <Typography variant="body1">•</Typography>
              <Typography variant="body2">
                ปีการศึกษา {roster?.semesterName}/{roster?.academicYear ?? '-'}
              </Typography>
            </Box>
            {isLoading || schedulesLoading || !currentTime ? (
              <Skeleton width={150} height={28} sx={{ mt: 1.5 }} />
            ) : (
              <Chip
                size="small"
                icon={
                  <Iconify
                    icon={activeSchedule ? 'solar:play-circle-bold' : 'solar:clock-circle-bold'}
                  />
                }
                label={statusLabel}
                sx={(theme) => ({
                  mt: 1.5,
                  color: 'common.white',
                  fontWeight: 700,
                  bgcolor: activeSchedule
                    ? 'success.main'
                    : varAlpha(theme.vars.palette.common.whiteChannel, 0.16),
                  '& .MuiChip-icon': { color: 'inherit' },
                })}
              />
            )}
          </Box>
          <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
            <ScoreReportExportButton teacherAssignmentId={teacherAssignmentId} />
            <Button
              variant="outlined"
              disabled={!roster?.subjectId}
              onClick={() => setImageDialogOpen(true)}
              sx={(theme) => ({
                flexShrink: 0,
                color: 'common.white',
                borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.4),
                '&:hover': {
                  borderColor: 'common.white',
                  bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
                },
              })}
            >
              จัดการรูปวิชา
            </Button>
            <Button
              component={RouterLink}
              href={assignmentNewPath}
              variant="contained"
              color="secondary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              sx={{ flexShrink: 0, color: 'primary.darker' }}
            >
              สร้างงาน
            </Button>
          </Box>
        </Box>
      </Card>

      <TeacherSubjectImageDialog
        open={imageDialogOpen}
        subjectId={roster?.subjectId ?? ''}
        subjectName={roster?.subjectName ?? 'รายวิชา'}
        imageUrl={roster?.subjectImageUrl ?? null}
        onClose={() => setImageDialogOpen(false)}
      />
    </>
  );
});
