'use client';

import { memo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { getRoster } from '../../teacher-assignment-actions';
import { ScoreReportExportButton } from './score-report-export-button';
import { TeacherSubjectImageDialog } from '../teacher-subject-image-dialog';

type Props = {
  teacherAssignmentId: string;
};

export const TeacherAssignmentDetailHeader = memo(function TeacherAssignmentDetailHeader({
  teacherAssignmentId,
}: Props) {
  const { user } = useAuthContext();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const isTeacher = user?.role === 'teacher';
  const backPath = isTeacher ? paths.teacher.assignments : paths.admin.teacherAssignment.root;
  const assignmentNewPath = isTeacher
    ? paths.teacher.assignmentNew(teacherAssignmentId)
    : paths.admin.teacherAssignment.assignmentNew(teacherAssignmentId);

  const { data: roster, isLoading } = useQuery({
    queryKey: ['roster', teacherAssignmentId],
    queryFn: () => getRoster(teacherAssignmentId),
  });

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
            sx={{ width: 120, height: 120, color: 'primary.darker', bgcolor: 'common.white' }}
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
                mt: 1.25,
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
