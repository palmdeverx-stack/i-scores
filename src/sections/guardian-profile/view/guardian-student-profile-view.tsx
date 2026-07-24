'use client';

import type { GuardianStudentProfile } from '../guardian-profile-actions';

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

import {
  RiShieldCheckLine,
  RiSchoolLine,
  RiUserHeartLine,
  RiGraduationCapLine,
} from 'src/components/remix-icon';

import { getGuardianProfile } from '../guardian-profile-actions';

// ----------------------------------------------------------------------

const STATUS = {
  studying: { label: 'กำลังศึกษา', color: 'success' as const },
  graduated: { label: 'สำเร็จการศึกษา', color: 'info' as const },
  transferred: { label: 'ย้ายโรงเรียน', color: 'warning' as const },
  withdrawn: { label: 'ลาออก', color: 'warning' as const },
  dismissed: { label: 'พ้นสภาพ', color: 'error' as const },
};

const GENDER = {
  male: 'ชาย',
  female: 'หญิง',
  other: 'อื่น ๆ',
  unspecified: 'ไม่ระบุ',
};

export function GuardianStudentProfileView() {
  const query = useQuery({
    queryKey: ['guardian-student-profile'],
    queryFn: getGuardianProfile,
    staleTime: 0,
    retry: false,
  });

  if (query.isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Skeleton variant="rounded" height={150} />
        <Skeleton variant="rounded" height={320} sx={{ mt: 3 }} />
      </Container>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 10 } }}>
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => query.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          {query.error?.message ??
            'ไม่สามารถเปิดโปรไฟล์ได้ กรุณาพิมพ์ “ข้อมูลนักเรียน” ใน LINE อีกครั้ง'}
        </Alert>
      </Container>
    );
  }

  const { school, students } = query.data;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, pb: 8 }}>
      <Card
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          color: 'common.white',
          borderRadius: 4,
          background: 'linear-gradient(135deg, #123A72 0%, #1976D2 100%)',
        }}
      >
        <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={school?.logo_url ?? undefined}
            sx={{ width: 68, height: 68, bgcolor: 'common.white', color: 'primary.main' }}
          >
            <RiSchoolLine size={30} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.75 }}>
              Parent Portal
            </Typography>
            <Typography component="h1" variant="h4">
              {school?.name ?? 'ข้อมูลนักเรียน'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
              โปรไฟล์บุตรหลานที่เชื่อมกับบัญชี LINE ของคุณ
            </Typography>
          </Box>
        </Box>
      </Card>

      <Box sx={{ gap: 3, mt: 3, display: 'grid' }}>
        {students.map((student) => (
          <StudentProfileCard key={student.id} student={student} />
        ))}
      </Box>

      <Alert severity="info" icon={<RiShieldCheckLine />} sx={{ mt: 3 }}>
        หน้านี้เป็นข้อมูลแบบอ่านอย่างเดียวและเปิดได้เฉพาะบัญชี LINE ผู้ปกครองที่เชื่อมกับโรงเรียน
      </Alert>
    </Container>
  );
}

function StudentProfileCard({ student }: { student: GuardianStudentProfile }) {
  const classroomValue = Array.isArray(student.enrollment?.classroom)
    ? student.enrollment.classroom[0]
    : student.enrollment?.classroom;
  const displayName =
    `${student.name_prefix ?? ''}${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() ||
    'นักเรียน';
  const englishName = `${student.first_name_en ?? ''} ${student.last_name_en ?? ''}`.trim();
  const status = STATUS[student.student_status ?? 'studying'];

  return (
    <Card variant="outlined" sx={{ overflow: 'hidden', borderRadius: 3 }}>
      <Box sx={{ p: { xs: 2.5, sm: 3 }, gap: 2.5, display: 'flex', alignItems: 'center' }}>
        <Avatar
          src={student.avatar_url ?? undefined}
          alt={displayName}
          sx={{ width: 82, height: 82, fontSize: 28, bgcolor: 'primary.lighter' }}
        >
          {student.first_name?.charAt(0) ?? <RiGraduationCapLine />}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography component="h2" variant="h5">
              {displayName}
            </Typography>
            <Chip size="small" color={status.color} label={status.label} variant="soft" />
          </Box>
          {englishName && (
            <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
              {englishName}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
            รหัสนักเรียน {student.student_code ?? 'ไม่ระบุ'}
            {student.nickname ? ` · ชื่อเล่น ${student.nickname}` : ''}
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box
        sx={{
          p: { xs: 2.5, sm: 3 },
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <ProfileFact label="ชั้นเรียน" value={classroomValue?.name ?? 'ยังไม่ได้ลงทะเบียน'} />
        <ProfileFact label="ปีการศึกษา" value={classroomValue?.academic_year?.year ?? 'ไม่ระบุ'} />
        <ProfileFact label="เลขที่" value={student.enrollment?.student_number ?? 'ไม่ระบุ'} />
        <ProfileFact
          label="วันเดือนปีเกิด"
          value={
            student.birth_date
              ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(
                  new Date(`${student.birth_date}T00:00:00`)
                )
              : 'ไม่ระบุ'
          }
        />
        <ProfileFact label="เพศ" value={GENDER[student.gender ?? 'unspecified']} />
        <ProfileFact label="สัญชาติ" value={student.nationality ?? 'ไม่ระบุ'} />
        <ProfileFact label="ศาสนา" value={student.religion ?? 'ไม่ระบุ'} />
        <ProfileFact
          label="ผู้ปกครองที่เชื่อม"
          value={
            student.guardian
              ? `${student.guardian.fullName} (${student.guardian.relationship})`
              : 'ไม่ระบุ'
          }
          icon={<RiUserHeartLine size={18} />}
        />
      </Box>
    </Card>
  );
}

function ProfileFact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ gap: 0.5, display: 'flex', alignItems: 'center', color: 'text.secondary' }}
      >
        {icon}
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}
