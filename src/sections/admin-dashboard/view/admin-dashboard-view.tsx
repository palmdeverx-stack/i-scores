'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { today, fIsBetween } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { getAdminDashboard } from '../admin-dashboard-actions';

// ----------------------------------------------------------------------

const statConfigs = [
  {
    key: 'students',
    label: 'นักเรียน',
    icon: 'solar:user-rounded-bold',
    color: '#3D5AFE',
    path: paths.admin.student.root,
  },
  {
    key: 'teachers',
    label: 'ครูผู้สอน',
    icon: 'solar:users-group-rounded-bold',
    color: '#0B7A57',
    path: paths.admin.user.root,
  },
  {
    key: 'classrooms',
    label: 'ห้องเรียน',
    icon: 'solar:add-folder-bold',
    color: '#E77817',
    path: paths.admin.classroom.root,
  },
  {
    key: 'subjects',
    label: 'รายวิชา',
    icon: 'solar:gallery-wide-bold',
    color: '#8E4EC6',
    path: paths.admin.subject.root,
  },
] as const;

const quickActions = [
  {
    label: 'เพิ่มนักเรียน',
    description: 'สร้างบัญชีนักเรียนใหม่',
    icon: 'solar:user-plus-bold',
    path: paths.admin.student.root,
  },
  {
    label: 'จัดการห้องเรียน',
    description: 'เพิ่มห้องและครูประจำชั้น',
    icon: 'solar:add-folder-bold',
    path: paths.admin.classroom.root,
  },
  {
    label: 'เปิดรายวิชา',
    description: 'กำหนดวิชาตามภาคเรียน',
    icon: 'solar:gallery-add-bold',
    path: paths.admin.subject.root,
  },
  {
    label: 'มอบหมายครู',
    description: 'กำหนดครูประจำวิชา',
    icon: 'solar:users-group-rounded-bold',
    path: paths.admin.teacherAssignment.root,
  },
] as const;

function displayName(person: {
  first_name: string | null;
  last_name: string | null;
  username: string;
}) {
  return `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.username;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(
    new Date(value)
  );
}

export function AdminDashboardView() {
  const { user } = useAuthContext();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
  });

  const activities = useMemo(() => {
    if (!data) return [];
    return [
      ...data.recentAssignments.map((item) => ({
        id: `assignment-${item.id}`,
        date: item.created_at,
        icon: 'solar:users-group-rounded-bold' as const,
        color: '#0B7A57',
        title: `มอบหมาย ${displayName(item.teacher)}`,
        detail: `${item.subject.code ? `${item.subject.code} · ` : ''}${item.subject.name} · ${item.classroom.name}`,
      })),
      ...data.recentEnrollments.map((item) => ({
        id: `enrollment-${item.id}`,
        date: item.created_at,
        icon: 'solar:user-plus-bold' as const,
        color: '#3D5AFE',
        title: `ลงทะเบียน ${displayName(item.student)}`,
        detail: `${item.classroom.name}${item.student_number ? ` · เลขที่ ${item.student_number}` : ''}`,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [data]);

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          ไม่สามารถโหลดข้อมูลภาพรวมได้
        </Alert>
      </Container>
    );
  }

  const activeSemester = data.academicYear?.semesters.find((semester) =>
    fIsBetween(today(), semester.start_date, semester.end_date)
  );
  const checklist = [
    { label: 'กำหนดปีการศึกษา', complete: !!data.academicYear },
    { label: 'เพิ่มภาคเรียน', complete: !!data.academicYear?.semesters.length },
    { label: 'เพิ่มครูผู้สอน', complete: data.counts.teachers > 0 },
    { label: 'สร้างห้องเรียน', complete: data.counts.classrooms > 0 },
    { label: 'เปิดรายวิชา', complete: data.counts.subjects > 0 },
    { label: 'ลงทะเบียนนักเรียน', complete: data.counts.enrollments > 0 },
  ];
  const completedSteps = checklist.filter((item) => item.complete).length;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Card
        sx={{
          mb: 3,
          p: { xs: 3, md: 4 },
          color: 'common.white',
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(135deg, #123D2B 0%, #176B4D 65%, #218C65 100%)',
          '&::after': {
            width: 300,
            height: 300,
            content: '""',
            borderRadius: '50%',
            position: 'absolute',
            right: { xs: -210, md: -70 },
            bottom: -220,
            bgcolor: 'rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box
          sx={{
            zIndex: 1,
            gap: 3,
            display: 'flex',
            position: 'relative',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar
              src={data.school.logo_url ?? undefined}
              alt={data.school.name}
              variant="rounded"
              sx={{
                width: { xs: 58, sm: 72 },
                height: { xs: 58, sm: 72 },
                color: 'primary.main',
                bgcolor: 'common.white',
              }}
            >
              {data.school.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, opacity: 0.78 }}>
                สวัสดี {user?.first_name || user?.username || 'ผู้ดูแลโรงเรียน'}
              </Typography>
              <Typography component="h1" variant="h3">
                {data.school.name}
              </Typography>
              <Box sx={{ gap: 1, mt: 1.25, display: 'flex', flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`รหัส ${data.school.code}`}
                  sx={{ color: 'inherit', bgcolor: 'rgba(255,255,255,0.14)' }}
                />
                {data.academicYear && (
                  <Chip
                    size="small"
                    label={`ปีการศึกษา ${data.academicYear.year}`}
                    sx={{ color: 'inherit', bgcolor: 'rgba(255,255,255,0.14)' }}
                  />
                )}
                {activeSemester && (
                  <Chip
                    size="small"
                    label={activeSemester.name}
                    sx={{ color: 'inherit', bgcolor: 'rgba(255,255,255,0.14)' }}
                  />
                )}
              </Box>
            </Box>
          </Box>
          <Button
            component={RouterLink}
            href={paths.admin.school}
            variant="contained"
            color="inherit"
            startIcon={<Iconify icon="solar:settings-bold" />}
            sx={{ flexShrink: 0, color: 'primary.darker' }}
          >
            ข้อมูลโรงเรียน
          </Button>
        </Box>
      </Card>

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {statConfigs.map((stat) => (
          <Card
            key={stat.key}
            component={RouterLink}
            href={stat.path}
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              color: 'text.primary',
              textDecoration: 'none',
              transition: 'transform 160ms ease, box-shadow 160ms ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: (theme) => theme.vars.customShadows.z8,
              },
            }}
          >
            <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  display: 'grid',
                  borderRadius: 2,
                  placeItems: 'center',
                  color: stat.color,
                  bgcolor: `${stat.color}14`,
                }}
              >
                <Iconify icon={stat.icon} width={27} />
              </Box>
              <Box>
                <Typography variant="h4">
                  {data.counts[stat.key].toLocaleString('th-TH')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {stat.label}
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
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(320px, 0.75fr)' },
        }}
      >
        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          <Card variant="outlined">
            <Box
              sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography component="h2" variant="h6">
                  กิจกรรมล่าสุด
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  การมอบหมายครูและลงทะเบียนนักเรียนล่าสุด
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                href={paths.admin.teacherAssignment.root}
                size="small"
                endIcon={<Iconify icon="solar:forward-bold" />}
              >
                ดูทั้งหมด
              </Button>
            </Box>
            <Divider />
            {activities.length ? (
              activities.map((activity, index) => (
                <Box key={activity.id}>
                  <Box sx={{ gap: 1.5, px: 3, py: 2, display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        display: 'grid',
                        borderRadius: '50%',
                        placeItems: 'center',
                        color: activity.color,
                        bgcolor: `${activity.color}14`,
                      }}
                    >
                      <Iconify icon={activity.icon} width={21} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {activity.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ display: 'block', color: 'text.secondary' }}
                      >
                        {activity.detail}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ flexShrink: 0, color: 'text.disabled' }}>
                      {formatShortDate(activity.date)}
                    </Typography>
                  </Box>
                  {index < activities.length - 1 && <Divider />}
                </Box>
              ))
            ) : (
              <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
                <Iconify icon="solar:list-bold" width={36} sx={{ mb: 1, color: 'text.disabled' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ยังไม่มีกิจกรรมล่าสุด
                </Typography>
              </Box>
            )}
          </Card>

          <Box>
            <Typography component="h2" variant="h6" sx={{ mb: 1.5 }}>
              ทางลัดจัดการ
            </Typography>
            <Box
              sx={{
                gap: 1.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              {quickActions.map((action) => (
                <Card
                  key={action.label}
                  component={RouterLink}
                  href={action.path}
                  variant="outlined"
                  sx={{
                    p: 2,
                    gap: 1.5,
                    display: 'flex',
                    color: 'text.primary',
                    alignItems: 'center',
                    textDecoration: 'none',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                      display: 'grid',
                      borderRadius: 1.5,
                      placeItems: 'center',
                      color: 'primary.main',
                      bgcolor: 'primary.lighter',
                    }}
                  >
                    <Iconify icon={action.icon} width={23} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2">{action.label}</Typography>
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ display: 'block', color: 'text.secondary' }}
                    >
                      {action.description}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
        </Box>

        <Card variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ p: 3, color: 'common.white', bgcolor: 'primary.darker' }}>
            <Typography component="h2" variant="h6">
              ความพร้อมของระบบ
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.74 }}>
              ตั้งค่าแล้ว {completedSteps} จาก {checklist.length} รายการ
            </Typography>
            <Box
              sx={{
                mt: 2,
                height: 8,
                overflow: 'hidden',
                borderRadius: 8,
                bgcolor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Box
                sx={{
                  width: `${(completedSteps / checklist.length) * 100}%`,
                  height: 1,
                  borderRadius: 'inherit',
                  bgcolor: 'success.light',
                  transition: 'width 240ms ease',
                }}
              />
            </Box>
          </Box>
          <Box sx={{ p: 2 }}>
            {checklist.map((item) => (
              <Box
                key={item.label}
                sx={{ gap: 1.25, px: 1, py: 1.25, display: 'flex', alignItems: 'center' }}
              >
                <Iconify
                  icon={item.complete ? 'solar:check-circle-bold' : 'solar:clock-circle-bold'}
                  width={21}
                  sx={{ color: item.complete ? 'success.main' : 'warning.main' }}
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {item.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: item.complete ? 'success.main' : 'text.secondary' }}
                >
                  {item.complete ? 'พร้อม' : 'รอดำเนินการ'}
                </Typography>
              </Box>
            ))}
          </Box>
          <Divider />
          <Box sx={{ p: 2.5 }}>
            <Typography variant="subtitle2">สถานะปีการศึกษา</Typography>
            <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
              {data.academicYear
                ? `ปี ${data.academicYear.year} · ${data.academicYear.semesters.length} ภาคเรียน`
                : 'ยังไม่ได้กำหนดปีการศึกษา'}
            </Typography>
            <Button
              component={RouterLink}
              href={paths.admin.academicYear.root}
              fullWidth
              variant="outlined"
              sx={{ mt: 2 }}
            >
              จัดการปีการศึกษา
            </Button>
          </Box>
        </Card>
      </Box>
    </Container>
  );
}

function DashboardSkeleton() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Skeleton variant="rounded" height={190} sx={{ mb: 3 }} />
      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        }}
      >
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} variant="rounded" height={98} />
        ))}
      </Box>
      <Box
        sx={{ gap: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.55fr 0.75fr' } }}
      >
        <Skeleton variant="rounded" height={420} />
        <Skeleton variant="rounded" height={420} />
      </Box>
    </Container>
  );
}
