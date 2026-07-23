'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';
import type { TeacherDashboardData } from '../teacher-dashboard-actions';

import { varAlpha } from 'minimal-shared/utils';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { getTeacherDashboard } from '../teacher-dashboard-actions';

// ----------------------------------------------------------------------

const summaryCards = [
  {
    key: 'subjects',
    label: 'รายวิชาที่สอน',
    suffix: 'วิชา',
    icon: 'solar:notebook-bold-duotone',
    color: 'primary.main',
    bgcolor: 'primary.lighter',
  },
  {
    key: 'classrooms',
    label: 'ห้องเรียน',
    suffix: 'ห้อง',
    icon: 'solar:users-group-rounded-bold-duotone',
    color: 'secondary.dark',
    bgcolor: 'secondary.lighter',
  },
  {
    key: 'students',
    label: 'นักเรียนทั้งหมด',
    suffix: 'คน',
    icon: 'solar:user-rounded-bold',
    color: 'success.main',
    bgcolor: 'success.lighter',
  },
  {
    key: 'assignments',
    label: 'งานที่มอบหมาย',
    suffix: 'งาน',
    icon: 'solar:list-bold',
    color: 'warning.dark',
    bgcolor: 'warning.lighter',
  },
] as const;

function displayName(person: TeacherDashboardData['teacher']) {
  return `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.username;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function TeacherDashboardView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: getTeacherDashboard,
  });

  if (isLoading) return <TeacherDashboardSkeleton />;

  if (isError || !data) {
    return (
      <Container maxWidth="xl" sx={{ py: 5 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ กรุณาลองใหม่อีกครั้ง
        </Alert>
      </Container>
    );
  }

  const teacherName = displayName(data.teacher);
  const todayText = new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(new Date());

  return (
    <Container maxWidth="xl" sx={{ pb: 5 }}>
      <Card
        sx={{
          mb: 3,
          p: { xs: 2, sm: 3 },
          color: 'common.white',
          overflow: 'hidden',
          position: 'relative',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.main} 62%, ${theme.vars.palette.primary.light} 100%)`,
          '&::before': {
            top: -110,
            right: -30,
            width: 280,
            height: 280,
            content: '""',
            borderRadius: '50%',
            position: 'absolute',
            bgcolor: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
          },
        }}
      >
        <Box
          sx={{
            gap: 3,
            zIndex: 1,
            display: 'flex',
            flexWrap: 'wrap',
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={(theme) => ({
                letterSpacing: 1.1,
                color: varAlpha(theme.vars.palette.common.whiteChannel, 0.78),
              })}
            >
              แดชบอร์ดครู
            </Typography>
            <Typography component="h1" variant="h3" sx={{ mt: 0.25 }}>
              สวัสดี ครู{teacherName}
            </Typography>
            <Typography
              sx={(theme) => ({
                mt: 1,
                color: varAlpha(theme.vars.palette.common.whiteChannel, 0.8),
              })}
            >
              {todayText}
            </Typography>
            <Box sx={{ gap: 1, mt: 2, display: 'flex', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={data.school?.name ?? 'ยังไม่มีข้อมูลโรงเรียน'}
                sx={(theme) => ({
                  color: 'common.white',
                  bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.15),
                })}
              />
              <Chip
                size="small"
                label={`วันนี้มี ${data.today_schedules.length} คาบ`}
                sx={(theme) => ({
                  color: 'common.white',
                  bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.15),
                })}
              />
            </Box>
          </Box>

          <Box sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap' }}>
            <Button
              component={RouterLink}
              href={paths.teacher.timetable}
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="solar:calendar-date-bold" />}
              sx={{ color: 'primary.darker', bgcolor: 'common.white' }}
            >
              ตารางสอน
            </Button>
            <Button
              component={RouterLink}
              href={paths.teacher.assignments}
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="solar:notebook-bold-duotone" />}
              sx={(theme) => ({
                borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.5),
                '&:hover': {
                  borderColor: 'common.white',
                  bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
                },
              })}
            >
              วิชาที่สอน
            </Button>
          </Box>
        </Box>
      </Card>

      {data.summary.waiting_to_grade > 0 && (
        <Alert
          severity="warning"
          icon={<Iconify icon="solar:file-check-bold-duotone" />}
          action={
            <Button component={RouterLink} href={paths.teacher.assignments} color="inherit">
              ไปตรวจงาน
            </Button>
          }
          sx={{ mb: 3 }}
        >
          มีงานของนักเรียนรอตรวจและบันทึกคะแนน {data.summary.waiting_to_grade} รายการ
        </Alert>
      )}

      <Box
        sx={{
          gap: 2,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(4, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        {summaryCards.map((item) => (
          <Card key={item.key} variant="outlined" sx={{ p: 2.5 }}>
            <Box sx={{ gap: 1.75, display: 'flex', alignItems: 'center' }}>
              <Avatar
                variant="rounded"
                sx={{ width: 50, height: 50, color: item.color, bgcolor: item.bgcolor }}
              >
                <Iconify icon={item.icon} width={27} />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4">
                  {data.summary[item.key].toLocaleString('th-TH')}{' '}
                  <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                    {item.suffix}
                  </Typography>
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {item.label}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(300px, 0.8fr)' },
        }}
      >
        <Box sx={{ gap: 3, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TodaySchedule schedules={data.today_schedules} />
          <RecentAssignments assignments={data.recent_assignments} />
        </Box>

        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          <WorkloadSummary data={data} />
        </Box>
      </Box>
    </Container>
  );
}

// ----------------------------------------------------------------------

function SectionHeader({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: IconifyName;
  href?: string;
}) {
  return (
    <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
      <Avatar variant="rounded" sx={{ mr: 1.5, color: 'primary.main', bgcolor: 'primary.lighter' }}>
        <Iconify icon={icon} width={22} />
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography component="h2" variant="h6">
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      </Box>
      {href && (
        <Button component={RouterLink} href={href} size="small">
          ดูทั้งหมด
        </Button>
      )}
    </Box>
  );
}

function TodaySchedule({ schedules }: { schedules: TeacherDashboardData['today_schedules'] }) {
  const bangkokTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(new Date());
  const nowMinutes = timeToMinutes(bangkokTime);

  return (
    <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <SectionHeader
        title="ตารางสอนวันนี้"
        description={schedules.length ? `${schedules.length} คาบเรียนวันนี้` : 'วันนี้ไม่มีคาบสอน'}
        icon="solar:calendar-date-bold"
        href={paths.teacher.timetable}
      />

      {schedules.length ? (
        <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
          {schedules.map((slot) => {
            const start = timeToMinutes(slot.start_time);
            const end = timeToMinutes(slot.end_time);
            const isTeaching = nowMinutes >= start && nowMinutes < end;
            const isFinished = nowMinutes >= end;

            return (
              <Box
                key={slot.id}
                component={RouterLink}
                href={paths.teacher.assignmentDetail(slot.teacher_assignment_id)}
                sx={{
                  gap: 2,
                  p: 2,
                  display: 'grid',
                  borderRadius: 2,
                  color: 'text.primary',
                  textDecoration: 'none',
                  bgcolor: isTeaching ? 'primary.lighter' : 'background.neutral',
                  border: '1px solid',
                  borderColor: isTeaching ? 'primary.light' : 'transparent',
                  gridTemplateColumns: {
                    xs: '72px minmax(0, 1fr)',
                    sm: '92px minmax(0, 1fr) auto',
                  },
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: isTeaching ? 'primary.main' : 'text.primary' }}
                  >
                    {formatTime(slot.start_time)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ถึง {formatTime(slot.end_time)}
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {slot.subject?.code ? `${slot.subject.code} · ` : ''}
                    {slot.subject?.name ?? 'ไม่ระบุรายวิชา'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                    ห้อง {slot.classroom?.name ?? '-'} · {slot.semester?.name ?? '-'}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  variant="soft"
                  color={isTeaching ? 'success' : isFinished ? 'default' : 'info'}
                  label={isTeaching ? 'กำลังสอน' : isFinished ? 'สอนแล้ว' : 'คาบถัดไป'}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                />
              </Box>
            );
          })}
        </Box>
      ) : (
        <EmptyState
          icon="solar:calendar-date-bold"
          text="วันนี้ไม่มีคาบสอน พักผ่อนให้เต็มที่นะครับ"
        />
      )}
    </Card>
  );
}

function RecentAssignments({
  assignments,
}: {
  assignments: TeacherDashboardData['recent_assignments'];
}) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <SectionHeader
        title="งานที่มอบหมายล่าสุด"
        description="ติดตามการส่งงานและสถานะการตรวจคะแนน"
        icon="solar:list-bold"
        href={paths.teacher.assignments}
      />

      {assignments.length ? (
        <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
          {assignments.map((assignment) => {
            const submittedPercent = assignment.student_count
              ? Math.min((assignment.submitted_count / assignment.student_count) * 100, 100)
              : 0;

            return (
              <Box
                key={assignment.id}
                sx={{
                  gap: 2,
                  p: 2,
                  display: 'grid',
                  borderRadius: 2,
                  bgcolor: 'background.neutral',
                  gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 180px auto' },
                  alignItems: 'center',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {assignment.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                    {assignment.subject?.name ?? 'ไม่ระบุรายวิชา'} · ห้อง{' '}
                    {assignment.classroom?.name ?? '-'} · {assignment.full_score} คะแนน
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      ส่งแล้ว
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {assignment.submitted_count}/{assignment.student_count}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={submittedPercent}
                    color={submittedPercent >= 100 ? 'success' : 'primary'}
                    sx={{ height: 7, borderRadius: 7 }}
                  />
                </Box>
                <Button
                  component={RouterLink}
                  href={paths.teacher.gradebook(assignment.id)}
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:file-check-bold-duotone" />}
                >
                  ตรวจงาน
                </Button>
              </Box>
            );
          })}
        </Box>
      ) : (
        <EmptyState icon="solar:list-bold" text="ยังไม่มีงานที่มอบหมายในรายวิชาของคุณ" />
      )}
    </Card>
  );
}

function WorkloadSummary({ data }: { data: TeacherDashboardData }) {
  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Typography component="h2" variant="h6">
        ภาระงานโดยรวม
      </Typography>
      <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
        ภาพรวมรายการที่คุณรับผิดชอบ
      </Typography>
      <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
        <WorkloadRow label="รายการสอน" value={data.summary.teaching_assignments} suffix="รายการ" />
        <WorkloadRow label="คาบสอนวันนี้" value={data.today_schedules.length} suffix="คาบ" />
        <WorkloadRow
          label="งานรอตรวจ"
          value={data.summary.waiting_to_grade}
          suffix="รายการ"
          alert
        />
      </Box>
    </Card>
  );
}

function WorkloadRow({
  label,
  value,
  suffix,
  alert = false,
}: {
  label: string;
  value: number;
  suffix: string;
  alert?: boolean;
}) {
  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        borderRadius: 2,
        alignItems: 'center',
        bgcolor: alert && value > 0 ? 'warning.lighter' : 'background.neutral',
      }}
    >
      <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ color: alert && value > 0 ? 'warning.dark' : 'text.primary' }}
      >
        {value.toLocaleString('th-TH')} {suffix}
      </Typography>
    </Box>
  );
}

function EmptyState({ icon, text }: { icon: IconifyName; text: string }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      <Iconify icon={icon} width={42} sx={{ mb: 1, color: 'text.disabled' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {text}
      </Typography>
    </Box>
  );
}

function TeacherDashboardSkeleton() {
  return (
    <Container maxWidth="xl" aria-label="กำลังโหลดแดชบอร์ดครู" sx={{ pb: 5 }}>
      <Skeleton variant="rounded" height={220} sx={{ mb: 3, borderRadius: 3 }} />
      <Box
        sx={{
          gap: 2,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={104} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
      <Box sx={{ gap: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.55fr 0.8fr' } }}>
        <Skeleton variant="rounded" height={480} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={480} sx={{ borderRadius: 2 }} />
      </Box>
    </Container>
  );
}
