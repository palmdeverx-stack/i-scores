'use client';

import type { AttendanceScanSessionType } from '../attendance-scan-actions';

import dayjs from 'dayjs';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

import { getMyHomeroomStudents } from 'src/sections/teacher-students/teacher-students-actions';
import { listTeacherAssignments } from 'src/sections/teacher-assignment/teacher-assignment-actions';

import { useAuthContext } from 'src/auth/hooks';

import { createAttendanceScanSession } from '../attendance-scan-actions';

// ----------------------------------------------------------------------

const SESSION_OPTIONS: Array<{
  value: AttendanceScanSessionType;
  title: string;
  description: string;
  icon:
    | 'solar:calendar-date-bold'
    | 'solar:notebook-bold-duotone'
    | 'solar:cloudy-moon-bold-duotone';
}> = [
  {
    value: 'homeroom_morning',
    title: 'เข้าแถวตอนเช้า',
    description: 'บันทึกนักเรียนในชั้นที่คุณเป็นครูประจำชั้น',
    icon: 'solar:calendar-date-bold',
  },
  {
    value: 'class_period',
    title: 'เข้าเรียนรายคาบ',
    description: 'เลือกวิชา ห้องเรียน และระบุชื่อคาบก่อนสแกน',
    icon: 'solar:notebook-bold-duotone',
  },
  {
    value: 'homeroom_evening',
    title: 'เข้าแถวตอนเย็น',
    description: 'บันทึกการเข้าแถวหรือกลับบ้านช่วงเย็น',
    icon: 'solar:cloudy-moon-bold-duotone',
  },
];

export function AttendanceScanStartView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [sessionType, setSessionType] = useState<AttendanceScanSessionType>('homeroom_morning');
  const [sessionDate, setSessionDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [classroomId, setClassroomId] = useState('');
  const [teacherAssignmentId, setTeacherAssignmentId] = useState('');
  const [periodLabel, setPeriodLabel] = useState('คาบที่ 1');
  const [lateAfterMinutes, setLateAfterMinutes] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const homeroomQuery = useQuery({
    queryKey: ['teacher-homeroom-students', user?.school_id, user?.id],
    queryFn: getMyHomeroomStudents,
    enabled: !!user?.school_id && !!user?.id,
  });
  const assignmentsQuery = useQuery({
    queryKey: ['teacher-assignments', user?.school_id, user?.id],
    queryFn: listTeacherAssignments,
    enabled: !!user?.school_id && !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAttendanceScanSession({
        sessionType,
        sessionDate,
        classroomId: sessionType === 'class_period' ? undefined : classroomId,
        teacherAssignmentId: sessionType === 'class_period' ? teacherAssignmentId : undefined,
        periodLabel: sessionType === 'class_period' ? periodLabel : undefined,
        durationMinutes,
        lateAfterMinutes,
      }),
    onSuccess: (sessionId) => router.push(paths.teacher.attendanceScanSession(sessionId)),
  });

  const canCreate =
    (sessionType === 'class_period'
      ? !!teacherAssignmentId && !!periodLabel.trim()
      : !!classroomId) &&
    durationMinutes >= 5 &&
    lateAfterMinutes >= 0 &&
    lateAfterMinutes <= durationMinutes;

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          สแกน QR เช็คชื่อ
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          เลือกว่ากำลังเช็คชื่ออะไร จากนั้นใช้ QR ประจำตัวนักเรียนอันเดิมสแกนได้ทันที
        </Typography>
      </Box>

      <Box
        sx={{
          gap: 2,
          mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {SESSION_OPTIONS.map((option) => {
          const selected = option.value === sessionType;
          return (
            <Box
              key={option.value}
              component="button"
              type="button"
              onClick={() => {
                setSessionType(option.value);
                createMutation.reset();
              }}
              sx={{
                p: 2.5,
                gap: 1.5,
                display: 'flex',
                cursor: 'pointer',
                borderRadius: 2,
                textAlign: 'left',
                font: 'inherit',
                color: 'text.primary',
                bgcolor: selected ? 'primary.lighter' : 'background.paper',
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  display: 'grid',
                  flexShrink: 0,
                  borderRadius: 1.5,
                  color: selected ? 'common.white' : 'primary.main',
                  placeItems: 'center',
                  bgcolor: selected ? 'primary.main' : 'primary.lighter',
                }}
              >
                <Iconify icon={option.icon} width={25} />
              </Box>
              <Box>
                <Typography variant="subtitle1">{option.title}</Typography>
                <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
                  {option.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {createMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {createMutation.error.message}
        </Alert>
      )}

      <Card variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h6">ตั้งค่ารอบเช็คชื่อ</Typography>
        <Box
          sx={{
            gap: 2,
            mt: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          <DatePicker
            label="วันที่"
            value={dayjs(sessionDate)}
            onChange={(value) => {
              if (value?.isValid()) setSessionDate(value.format('YYYY-MM-DD'));
            }}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small' } }}
          />

          {sessionType === 'class_period' ? (
            <TextField
              select
              size="small"
              label="วิชาและห้องเรียน"
              value={teacherAssignmentId}
              onChange={(event) => setTeacherAssignmentId(event.target.value)}
            >
              {(assignmentsQuery.data ?? []).map((assignment) => (
                <MenuItem key={assignment.id} value={assignment.id}>
                  {assignment.subject.code ? `${assignment.subject.code} · ` : ''}
                  {assignment.subject.name} · {assignment.classroom.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              size="small"
              label="ชั้นเรียน"
              value={classroomId}
              onChange={(event) => setClassroomId(event.target.value)}
            >
              {(homeroomQuery.data?.classrooms ?? []).map((classroom) => (
                <MenuItem key={classroom.id} value={classroom.id}>
                  {classroom.name} · ปี {classroom.academic_years?.year ?? '-'}
                </MenuItem>
              ))}
            </TextField>
          )}

          {sessionType === 'class_period' && (
            <TextField
              size="small"
              label="ชื่อคาบ"
              value={periodLabel}
              onChange={(event) => setPeriodLabel(event.target.value)}
              placeholder="เช่น คาบที่ 1"
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          )}
          <TextField
            size="small"
            type="number"
            label="เริ่มนับว่าสายหลัง (นาที)"
            value={lateAfterMinutes}
            onChange={(event) => setLateAfterMinutes(Number(event.target.value))}
            slotProps={{ htmlInput: { min: 0, max: durationMinutes } }}
          />
          <TextField
            size="small"
            type="number"
            label="เปิดรับสแกนทั้งหมด (นาที)"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            slotProps={{ htmlInput: { min: 5, max: 480 } }}
          />
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="large"
            variant="contained"
            disabled={!canCreate}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
            startIcon={<Iconify icon="solar:camera-add-bold" />}
          >
            เปิดกล้องสแกน
          </Button>
        </Box>
      </Card>
    </Container>
  );
}
