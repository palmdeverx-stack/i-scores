'use client';

import type { RosterStudent } from '../teacher-assignment-actions';
import type { SubmissionStatus } from 'src/sections/gradebook/gradebook-actions';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { listAssignments } from 'src/sections/assignment/assignment-actions';
import { StudentGuardiansDialog } from 'src/sections/student-guardian/components/student-guardians-dialog';

import { useAuthContext } from 'src/auth/hooks';

import { AttendanceSection } from '../components/attendance-section';
import { TeacherSubjectImageDialog } from '../components/teacher-subject-image-dialog';
import {
  getRoster,
  getSchedules,
  createSchedule,
  deleteSchedule,
  getStudentBreakdown,
} from '../teacher-assignment-actions';

// ----------------------------------------------------------------------

const DAY_LABELS = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: 'ส่งแล้ว',
  late: 'ส่งช้า',
  not_submitted: 'ยังไม่ส่ง',
  absent: 'ขาดสอบ',
  sick_leave: 'ลาป่วย',
  pending_review: 'รอตรวจ',
};

const STATUS_COLOR: Record<SubmissionStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> =
  {
    submitted: 'success',
    late: 'warning',
    not_submitted: 'error',
    absent: 'error',
    sick_leave: 'info',
    pending_review: 'default',
  };

// ----------------------------------------------------------------------

type Props = {
  teacherAssignmentId: string;
};

export function TeacherAssignmentDetailView({ teacherAssignmentId }: Props) {
  const { user } = useAuthContext();
  const isTeacher = user?.role === 'teacher';
  const [tab, setTab] = useState<
    'overview' | 'students' | 'attendance' | 'assignments' | 'schedule'
  >('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [guardianStudent, setGuardianStudent] = useState<RosterStudent | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const backPath = isTeacher ? paths.teacher.assignments : paths.admin.teacherAssignment.root;

  const assignmentNewPath = isTeacher
    ? paths.teacher.assignmentNew(teacherAssignmentId)
    : paths.admin.teacherAssignment.assignmentNew(teacherAssignmentId);

  const gradebookPath = (assignmentId: string) =>
    isTeacher ? paths.teacher.gradebook(assignmentId) : paths.admin.gradebook(assignmentId);

  const {
    data: roster,
    isLoading: rosterLoading,
    isError: rosterError,
  } = useQuery({
    queryKey: ['roster', teacherAssignmentId],
    queryFn: () => getRoster(teacherAssignmentId),
  });

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    isError: assignmentsError,
  } = useQuery({
    queryKey: ['assignments', teacherAssignmentId],
    queryFn: () => listAssignments(teacherAssignmentId),
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', teacherAssignmentId],
    queryFn: () => getSchedules(teacherAssignmentId),
  });

  const teacherName = roster?.teacher
    ? `${roster.teacher.first_name ?? ''} ${roster.teacher.last_name ?? ''}`.trim() ||
      roster.teacher.username
    : '-';

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
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
          p: { xs: 3, sm: 4 },
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
            alignItems: { xs: 'flex-start', sm: 'center' },
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
              {rosterLoading ? (
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
              <Typography variant="body2">ห้อง {roster?.classroomName ?? '-'}</Typography>
              <Typography variant="body2">•</Typography>
              <Typography variant="body2">{roster?.semesterName ?? 'ไม่ระบุภาคเรียน'}</Typography>
              <Typography variant="body2">•</Typography>
              <Typography variant="body2">ปีการศึกษา {roster?.academicYear ?? '-'}</Typography>
            </Box>
          </Box>
          <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
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

      {(rosterError || assignmentsError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาลองรีเฟรชหน้าอีกครั้ง
        </Alert>
      )}

      <TeacherSubjectImageDialog
        open={imageDialogOpen}
        subjectId={roster?.subjectId ?? ''}
        subjectName={roster?.subjectName ?? 'รายวิชา'}
        imageUrl={roster?.subjectImageUrl ?? null}
        onClose={() => setImageDialogOpen(false)}
      />

      <Card variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="ส่วนข้อมูลรายวิชา"
          sx={{ px: { xs: 1, sm: 2 } }}
        >
          <Tab
            value="overview"
            label="ภาพรวม"
            icon={<Iconify icon="solar:chart-square-outline" />}
            iconPosition="start"
          />
          <Tab
            value="students"
            label={`นักเรียน (${roster?.roster.length ?? 0})`}
            icon={<Iconify icon="solar:users-group-rounded-bold" />}
            iconPosition="start"
          />
          <Tab
            value="attendance"
            label="เช็คชื่อ"
            icon={<Iconify icon="solar:check-circle-bold" />}
            iconPosition="start"
          />
          <Tab
            value="assignments"
            label={`งานและคะแนน (${assignments?.length ?? 0})`}
            icon={<Iconify icon="solar:list-bold" />}
            iconPosition="start"
          />
          <Tab
            value="schedule"
            label={`ตารางสอน (${schedules?.length ?? 0})`}
            icon={<Iconify icon="solar:calendar-date-bold" />}
            iconPosition="start"
          />
        </Tabs>
      </Card>

      <Box role="tabpanel" hidden={tab !== 'overview'}>
        {tab === 'overview' && (
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              <OverviewCard
                label="นักเรียนในห้อง"
                value={rosterLoading ? null : (roster?.roster.length ?? 0)}
                suffix="คน"
                icon="solar:users-group-rounded-bold"
                color="primary.main"
                bgcolor="primary.lighter"
              />
              <OverviewCard
                label="งานทั้งหมด"
                value={assignmentsLoading ? null : (assignments?.length ?? 0)}
                suffix="งาน"
                icon="solar:list-bold"
                color="secondary.dark"
                bgcolor="secondary.lighter"
              />
              <OverviewCard
                label="คาบเรียนต่อสัปดาห์"
                value={schedulesLoading ? null : (schedules?.length ?? 0)}
                suffix="คาบ"
                icon="solar:calendar-date-bold"
                color="warning.main"
                bgcolor="warning.lighter"
              />
            </Box>

            <Box
              sx={{
                gap: 3,
                display: 'grid',
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              }}
            >
              <Card variant="outlined">
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="h6">ข้อมูลการสอน</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    รายละเอียดสำคัญของรายวิชานี้
                  </Typography>
                </Box>
                <Divider />
                <Box
                  sx={{ p: 2.5, gap: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}
                >
                  <InfoItem label="ครูผู้สอน" value={teacherName} />
                  <InfoItem label="ห้องเรียน" value={roster?.classroomName ?? '-'} />
                  <InfoItem label="ภาคเรียน" value={roster?.semesterName ?? '-'} />
                  <InfoItem label="หน่วยกิต" value={`${roster?.credits ?? 0} หน่วยกิต`} />
                </Box>
              </Card>

              <Card variant="outlined">
                <Box
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="h6">ตารางสอนใกล้เคียง</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      คาบเรียนประจำสัปดาห์
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => setTab('schedule')}>
                    จัดการ
                  </Button>
                </Box>
                <Divider />
                <Box sx={{ p: 2.5, gap: 1.25, display: 'flex', flexDirection: 'column' }}>
                  {schedulesLoading && <Skeleton height={76} />}
                  {!schedulesLoading && !schedules?.length && (
                    <Typography
                      variant="body2"
                      sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}
                    >
                      ยังไม่มีตารางสอน
                    </Typography>
                  )}
                  {schedules?.slice(0, 3).map((slot) => (
                    <Box key={slot.id} sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          display: 'grid',
                          borderRadius: 1.5,
                          placeItems: 'center',
                          color: 'primary.main',
                          bgcolor: 'primary.lighter',
                        }}
                      >
                        <Iconify icon="solar:clock-circle-bold" width={20} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2">
                          วัน{DAY_LABELS[slot.day_of_week]}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} น.
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Box>
          </Box>
        )}
      </Box>

      <Box role="tabpanel" hidden={tab !== 'students'}>
        {tab === 'students' && (
          <Card variant="outlined">
            <Box sx={{ p: 2.5 }}>
              <Typography variant="h6">รายชื่อนักเรียน</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                กดดูรายละเอียดเพื่อตรวจคะแนนและสถานะการส่งงานรายคน
              </Typography>
            </Box>
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>เลขที่</TableCell>
                    <TableCell>ชื่อ-นามสกุล</TableCell>
                    <TableCell>ชื่อผู้ใช้งาน</TableCell>
                    <TableCell>ผู้ปกครอง</TableCell>
                    <TableCell align="right">การจัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rosterLoading && (
                    <TableRow>
                      <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                    </TableRow>
                  )}
                  {!rosterLoading && !roster?.roster.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                      >
                        ยังไม่มีนักเรียนในห้องนี้
                      </TableCell>
                    </TableRow>
                  )}
                  {roster?.roster.map((row) => {
                    const studentName =
                      `${row.student.first_name ?? ''} ${row.student.last_name ?? ''}`.trim() ||
                      row.student.username;
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.student_number ?? '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ gap: 1.25, display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              src={row.student.avatar_url ?? undefined}
                              sx={{
                                width: 34,
                                height: 34,
                                typography: 'subtitle2',
                                color: 'primary.main',
                                bgcolor: 'primary.lighter',
                              }}
                            >
                              {studentName.charAt(0)}
                            </Avatar>
                            <Typography variant="subtitle2">{studentName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            @{row.student.username}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="inherit"
                            startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                            onClick={() => setGuardianStudent(row.student)}
                          >
                            ข้อมูลผู้ปกครอง
                          </Button>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedStudentId(row.student.id)}
                          >
                            ดูผลการเรียน
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Box>

      <Box role="tabpanel" hidden={tab !== 'attendance'}>
        {tab === 'attendance' && <AttendanceSection teacherAssignmentId={teacherAssignmentId} />}
      </Box>

      <Box role="tabpanel" hidden={tab !== 'assignments'}>
        {tab === 'assignments' && (
          <Card variant="outlined">
            <Box
              sx={{
                p: 2.5,
                gap: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h6">งานและคะแนน</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  สร้างงานและเข้าสู่สมุดคะแนนของแต่ละงาน
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                href={assignmentNewPath}
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                สร้างงาน
              </Button>
            </Box>
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ชื่องาน</TableCell>
                    <TableCell>รายละเอียด</TableCell>
                    <TableCell>กำหนดส่ง</TableCell>
                    <TableCell align="center">คะแนนเต็ม</TableCell>
                    <TableCell align="right">การจัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignmentsLoading && (
                    <TableRow>
                      <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                    </TableRow>
                  )}
                  {!assignmentsLoading && !assignments?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                      >
                        ยังไม่มีงาน กด “สร้างงาน” เพื่อเริ่มต้น
                      </TableCell>
                    </TableRow>
                  )}
                  {assignments?.map((assignment) => (
                    <TableRow key={assignment.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{assignment.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 360, color: 'text.secondary' }}
                        >
                          {assignment.description || 'ไม่มีรายละเอียด'}
                        </Typography>
                        {!!assignment.attachments.length && (
                          <Box sx={{ gap: 0.75, mt: 1, display: 'flex', flexWrap: 'wrap' }}>
                            {assignment.attachments.map((file) => (
                              <Link
                                key={file.id}
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                                variant="caption"
                              >
                                {file.file_name}
                              </Link>
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {assignment.due_at
                            ? fDateTime(assignment.due_at, 'DD/MM/YYYY HH:mm')
                            : 'ไม่กำหนด'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{assignment.full_score}</TableCell>
                      <TableCell align="right">
                        <Button
                          component={RouterLink}
                          href={gradebookPath(assignment.id)}
                          size="small"
                          variant="outlined"
                        >
                          เปิดสมุดคะแนน
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Box>

      <Box role="tabpanel" hidden={tab !== 'schedule'}>
        {tab === 'schedule' && <ScheduleSection teacherAssignmentId={teacherAssignmentId} />}
      </Box>

      <StudentBreakdownDialog
        teacherAssignmentId={teacherAssignmentId}
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />
      <StudentGuardiansDialog
        open={!!guardianStudent}
        student={guardianStudent}
        teacherAssignmentId={teacherAssignmentId}
        onClose={() => setGuardianStudent(null)}
      />
    </Container>
  );
}

// ----------------------------------------------------------------------

type OverviewCardProps = {
  label: string;
  value: number | null;
  suffix: string;
  icon: 'solar:users-group-rounded-bold' | 'solar:list-bold' | 'solar:calendar-date-bold';
  color: string;
  bgcolor: string;
};

function OverviewCard({ label, value, suffix, icon, color, bgcolor }: OverviewCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            flexShrink: 0,
            display: 'grid',
            borderRadius: 1.75,
            placeItems: 'center',
            color,
            bgcolor,
          }}
        >
          <Iconify icon={icon} width={25} />
        </Box>
        <Box>
          <Typography variant="h4">
            {value === null ? (
              <Skeleton width={44} />
            ) : (
              `${value.toLocaleString('th-TH')} ${suffix}`
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

function ScheduleSection({ teacherAssignmentId }: { teacherAssignmentId: string }) {
  const queryClient = useQueryClient();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', teacherAssignmentId],
    queryFn: () => getSchedules(teacherAssignmentId),
  });

  const createMutation = useMutation({
    mutationFn: () => createSchedule(teacherAssignmentId, { dayOfWeek, startTime, endTime }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules', teacherAssignmentId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (scheduleId: string) => deleteSchedule(teacherAssignmentId, scheduleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules', teacherAssignmentId] });
    },
  });

  return (
    <Card variant="outlined">
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6">ตารางเวลาสอน</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          กำหนดวันและเวลาที่สอนรายวิชานี้ในแต่ละสัปดาห์
        </Typography>
      </Box>
      <Divider />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>วัน</TableCell>
              <TableCell>เวลาเริ่ม</TableCell>
              <TableCell>เวลาสิ้นสุด</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>กำลังโหลด...</TableCell>
              </TableRow>
            )}

            {!isLoading && !schedules?.length && (
              <TableRow>
                <TableCell colSpan={4}>ยังไม่มีตารางเวลาสอนสำหรับวิชานี้</TableCell>
              </TableRow>
            )}

            {schedules?.map((slot) => (
              <TableRow key={slot.id}>
                <TableCell>{DAY_LABELS[slot.day_of_week]}</TableCell>
                <TableCell>{slot.start_time.slice(0, 5)}</TableCell>
                <TableCell>{slot.end_time.slice(0, 5)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => deleteMutation.mutate(slot.id)}
                    aria-label={`ลบตารางสอนวัน${DAY_LABELS[slot.day_of_week]}`}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {createMutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {createMutation.error.message}
          </Alert>
        )}
        <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="วัน"
            value={dayOfWeek}
            onChange={(event) => setDayOfWeek(Number(event.target.value))}
            sx={{ minWidth: 120 }}
          >
            {DAY_LABELS.slice(1).map((label, index) => (
              <MenuItem key={label} value={index + 1}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="time"
            size="small"
            label="เวลาเริ่ม"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="time"
            size="small"
            label="เวลาสิ้นสุด"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            เพิ่มคาบสอน
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

type StudentBreakdownDialogProps = {
  teacherAssignmentId: string;
  studentId: string | null;
  onClose: () => void;
};

function StudentBreakdownDialog({
  teacherAssignmentId,
  studentId,
  onClose,
}: StudentBreakdownDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-breakdown', teacherAssignmentId, studentId],
    queryFn: () => getStudentBreakdown(teacherAssignmentId, studentId!),
    enabled: !!studentId,
  });

  const notSubmittedCount =
    data?.rows.filter((row) => row.score.status === 'not_submitted').length ?? 0;

  const totalScore = data?.rows.reduce((sum, row) => sum + (row.score.score ?? 0), 0) ?? 0;
  const totalFullScore = data?.rows.reduce((sum, row) => sum + row.assignment.full_score, 0) ?? 0;

  return (
    <Dialog open={!!studentId} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {data
          ? `${data.student.first_name ?? ''} ${data.student.last_name ?? ''}`.trim() ||
            data.student.username
          : 'รายละเอียดนักเรียน'}
      </DialogTitle>

      <DialogContent>
        {isLoading && <Typography sx={{ py: 3 }}>กำลังโหลด...</Typography>}

        {!isLoading && data && (
          <>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              คะแนนรวม {totalScore} จาก {totalFullScore} — ยังไม่ส่งงาน {notSubmittedCount} รายการ
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ชื่องาน</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="right">คะแนน</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {!data.rows.length && (
                  <TableRow>
                    <TableCell colSpan={3}>ยังไม่มีงานในวิชานี้</TableCell>
                  </TableRow>
                )}

                {data.rows.map((row) => (
                  <TableRow key={row.assignment.id}>
                    <TableCell>{row.assignment.title}</TableCell>
                    <TableCell>
                      <Label variant="soft" color={STATUS_COLOR[row.score.status]}>
                        {STATUS_LABEL[row.score.status]}
                      </Label>
                    </TableCell>
                    <TableCell align="right">
                      {row.score.score ?? '-'} / {row.assignment.full_score}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
