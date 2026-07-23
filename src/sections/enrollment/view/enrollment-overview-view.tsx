'use client';

import type { IconifyName } from 'src/components/iconify/register-icons';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { listClassrooms } from 'src/sections/classroom/classroom-actions';

import { listEnrollments } from '../enrollment-actions';
import { BulkPromoteDialog } from '../components/bulk-promote-dialog';

// ----------------------------------------------------------------------

export function EnrollmentOverviewView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);

  const {
    data: classrooms = [],
    isLoading: classroomsLoading,
    isError: classroomsError,
    refetch: refetchClassrooms,
  } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => listClassrooms(),
  });
  const {
    data: enrollments = [],
    isLoading: enrollmentsLoading,
    isError: enrollmentsError,
    refetch: refetchEnrollments,
  } = useQuery({
    queryKey: ['enrollments', 'all'],
    queryFn: () => listEnrollments(),
  });

  const classroomCounts = useMemo(() => {
    const counts = new Map<string, number>();
    enrollments.forEach((enrollment) => {
      counts.set(enrollment.classroom.id, (counts.get(enrollment.classroom.id) ?? 0) + 1);
    });
    return counts;
  }, [enrollments]);

  const groupedClassrooms = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    const visible = classrooms.filter((classroom) => {
      if (!keyword) return true;
      return [classroom.name, classroom.grade_level, classroom.academic_years?.year]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword);
    });

    return visible.reduce<
      Array<{ academicYearId: string; year: string; classrooms: typeof classrooms }>
    >((groups, classroom) => {
      const existing = groups.find((group) => group.academicYearId === classroom.academic_year_id);
      if (existing) {
        existing.classrooms.push(classroom);
      } else {
        groups.push({
          academicYearId: classroom.academic_year_id,
          year: classroom.academic_years?.year ?? 'ไม่ระบุปีการศึกษา',
          classrooms: [classroom],
        });
      }
      return groups;
    }, []);
  }, [classrooms, search]);

  const isLoading = classroomsLoading || enrollmentsLoading;
  const isError = classroomsError || enrollmentsError;
  const registeredStudents = new Set(enrollments.map((enrollment) => enrollment.student.id)).size;
  const emptyClassrooms = classrooms.filter(
    (classroom) => !classroomCounts.get(classroom.id)
  ).length;

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
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
            ลงทะเบียนนักเรียน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            เลือกชั้นเรียนเพื่อดูรายชื่อและเพิ่มนักเรียนเข้าห้อง
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => setPromoteDialogOpen(true)}
          startIcon={<Iconify icon="solar:double-alt-arrow-up-bold-duotone" />}
        >
          เลื่อนชั้นยกชุด
        </Button>
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                refetchClassrooms();
                refetchEnrollments();
              }}
            >
              ลองอีกครั้ง
            </Button>
          }
          sx={{ mb: 3 }}
        >
          ไม่สามารถโหลดข้อมูลชั้นเรียนได้
        </Alert>
      )}

      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        <SummaryCard
          icon="solar:users-group-rounded-bold"
          label="ชั้นเรียนทั้งหมด"
          value={classrooms.length}
          color="primary.main"
          bgcolor="primary.lighter"
        />
        <SummaryCard
          icon="solar:user-rounded-bold"
          label="นักเรียนที่ลงทะเบียน"
          value={registeredStudents}
          color="success.main"
          bgcolor="success.lighter"
        />
        <SummaryCard
          icon="solar:inbox-bold"
          label="ห้องที่ยังไม่มีนักเรียน"
          value={emptyClassrooms}
          color="warning.main"
          bgcolor="warning.lighter"
        />
      </Box>

      <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            mb: 3,
            gap: 2,
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography component="h2" variant="h6">
              ชั้นเรียน
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `พบ ${classrooms.length} ห้องเรียน`}
            </Typography>
          </Box>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชั้นเรียนหรือปีการศึกษา"
            aria-label="ค้นหาชั้นเรียน"
            sx={{ width: { xs: 1, sm: 320 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {!isLoading && !groupedClassrooms.length && (
          <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
            <Iconify icon="solar:users-group-rounded-bold-duotone" width={48} />
            <Typography sx={{ mt: 1 }}>
              {classrooms.length ? 'ไม่พบชั้นเรียนที่ค้นหา' : 'ยังไม่มีชั้นเรียน'}
            </Typography>
          </Box>
        )}

        {groupedClassrooms.map((group) => (
          <Box key={group.academicYearId} sx={{ '&:not(:last-of-type)': { mb: 4 } }}>
            <Box sx={{ mb: 1.5, gap: 1, display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle1">ปีการศึกษา {group.year}</Typography>
              <Label variant="soft" color="info">
                {group.classrooms.length} ห้อง
              </Label>
            </Box>
            <Box
              sx={{
                gap: 2,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {group.classrooms.map((classroom) => (
                <ClassroomCard
                  key={classroom.id}
                  name={classroom.name}
                  gradeLevel={classroom.grade_level}
                  studentCount={classroomCounts.get(classroom.id) ?? 0}
                  onClick={() => router.push(paths.admin.enrollment.classroom(classroom.id))}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Card>

      <BulkPromoteDialog open={promoteDialogOpen} onClose={() => setPromoteDialogOpen(false)} />
    </Container>
  );
}

// ----------------------------------------------------------------------

type ClassroomCardProps = {
  name: string;
  gradeLevel: string | null;
  studentCount: number;
  onClick: () => void;
};

function ClassroomCard({ name, gradeLevel, studentCount, onClick }: ClassroomCardProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        p: 2.5,
        gap: 2,
        display: 'flex',
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 2,
        alignItems: 'center',
        font: 'inherit',
        color: 'text.primary',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: (theme) =>
          theme.transitions.create(['border-color', 'box-shadow', 'transform']),
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
          boxShadow: (theme) => theme.vars.customShadows.z8,
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          display: 'grid',
          borderRadius: 1.75,
          color: 'primary.main',
          placeItems: 'center',
          bgcolor: 'primary.lighter',
        }}
      >
        <Iconify icon="solar:users-group-rounded-bold" width={27} />
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="subtitle1" noWrap>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {gradeLevel || 'ไม่ระบุระดับชั้น'}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="h6">{studentCount}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          คน
        </Typography>
      </Box>
      <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ color: 'text.disabled' }} />
    </Box>
  );
}

// ----------------------------------------------------------------------

type SummaryCardProps = {
  icon: IconifyName;
  label: string;
  value: number;
  color: string;
  bgcolor: string;
};

function SummaryCard({ icon, label, value, color, bgcolor }: SummaryCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            display: 'grid',
            borderRadius: 1.5,
            color,
            placeItems: 'center',
            bgcolor,
          }}
        >
          <Iconify icon={icon} width={25} />
        </Box>
        <Box>
          <Typography variant="h4">{value}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
