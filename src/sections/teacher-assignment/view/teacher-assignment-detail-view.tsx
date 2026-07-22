'use client';

import type { RosterStudent } from '../teacher-assignment-actions';
import type { Assignment, AssignmentCategory } from 'src/sections/assignment/assignment-actions';

import { useState, useEffect } from 'react';
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
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { StudentGuardiansDialog } from 'src/sections/student-guardian/components/student-guardians-dialog';
import {
  listAssignments,
  ASSIGNMENT_CATEGORY_META,
} from 'src/sections/assignment/assignment-actions';

import { useAuthContext } from 'src/auth/hooks';

import { QuickScoreDialog } from '../components/quick-score-dialog';
import { AttendanceSection } from '../components/attendance-section';
import { StudentBreakdownDialog } from '../components/student-breakdown-dialog';
import { ScoreItemActionsDialog } from '../components/score-item-actions-dialog';
import { TeacherSubjectImageDialog } from '../components/teacher-subject-image-dialog';
import {
  getRoster,
  getSchedules,
  createSchedule,
  deleteSchedule,
} from '../teacher-assignment-actions';

// ----------------------------------------------------------------------

const DAY_LABELS = ['', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

// ----------------------------------------------------------------------

type TabValue = 'overview' | 'students' | 'attendance' | 'assignments' | 'scores' | 'schedule';

const TAB_VALUES: TabValue[] = [
  'overview',
  'students',
  'attendance',
  'assignments',
  'scores',
  'schedule',
];

type Props = {
  teacherAssignmentId: string;
};

export function TeacherAssignmentDetailView({ teacherAssignmentId }: Props) {
  const { user } = useAuthContext();
  const isTeacher = user?.role === 'teacher';
  const [tab, setTab] = useState<TabValue>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [guardianStudent, setGuardianStudent] = useState<RosterStudent | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  useEffect(() => {
    const initialTab = new URLSearchParams(window.location.search).get('tab');
    if (initialTab && TAB_VALUES.includes(initialTab as TabValue)) {
      setTab(initialTab as TabValue);
    }
  }, []);

  const backPath = isTeacher ? paths.teacher.assignments : paths.admin.teacherAssignment.root;

  const assignmentNewPath = isTeacher
    ? paths.teacher.assignmentNew(teacherAssignmentId)
    : paths.admin.teacherAssignment.assignmentNew(teacherAssignmentId);

  const scoreCategoryNewPath = (category: AssignmentCategory) =>
    `${assignmentNewPath}?category=${category}&returnTab=scores`;

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

  const workAssignments = assignments?.filter((assignment) => assignment.category === 'assignment');

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
              <Typography variant="body1">ห้อง {roster?.classroomName ?? '-'}</Typography>
              <Typography variant="body1">•</Typography>
              <Typography variant="body2">
                ปีการศึกษา {roster?.semesterName}/{roster?.academicYear ?? '-'}
              </Typography>
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
            label={`งาน (${workAssignments?.length ?? 0})`}
            icon={<Iconify icon="solar:list-bold" />}
            iconPosition="start"
          />
          <Tab
            value="scores"
            label="จัดการคะแนน"
            icon={<Iconify icon="solar:cup-star-bold" />}
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
                value={assignmentsLoading ? null : (workAssignments?.length ?? 0)}
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
                <Typography variant="h6">งาน</Typography>
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
                  {!assignmentsLoading && !workAssignments?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                      >
                        ยังไม่มีงาน กด “สร้างงาน” เพื่อเริ่มต้น
                      </TableCell>
                    </TableRow>
                  )}
                  {workAssignments?.map((assignment) => (
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

      <Box role="tabpanel" hidden={tab !== 'scores'}>
        {tab === 'scores' && (
          <ManageScoresSection
            teacherAssignmentId={teacherAssignmentId}
            assignments={assignments}
            assignmentsLoading={assignmentsLoading}
            gradebookPath={gradebookPath}
            scoreCategoryNewPath={scoreCategoryNewPath}
          />
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

const SCORE_CATEGORY_ORDER: AssignmentCategory[] = [
  'assignment',
  'quiz',
  'midterm',
  'final',
  'other',
];

const SCORE_CATEGORY_ICON = {
  assignment: 'solar:notes-bold-duotone',
  quiz: 'solar:bill-list-bold-duotone',
  midterm: 'solar:notebook-bold-duotone',
  final: 'solar:cup-star-bold',
  other: 'solar:palette-bold-duotone',
} as const satisfies Record<AssignmentCategory, string>;

type ManageScoresSectionProps = {
  teacherAssignmentId: string;
  assignments: Assignment[] | undefined;
  assignmentsLoading: boolean;
  gradebookPath: (assignmentId: string) => string;
  scoreCategoryNewPath: (category: AssignmentCategory) => string;
};

function ManageScoresSection({
  teacherAssignmentId,
  assignments,
  assignmentsLoading,
  gradebookPath,
  scoreCategoryNewPath,
}: ManageScoresSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<AssignmentCategory>('assignment');
  const [scoreItemAction, setScoreItemAction] = useState<{
    mode: 'edit' | 'delete';
    assignment: Assignment;
  } | null>(null);
  const [quickCategory, setQuickCategory] = useState<Exclude<
    AssignmentCategory,
    'assignment'
  > | null>(null);

  const categoryItems =
    assignments?.filter((assignment) => assignment.category === selectedCategory) ?? [];
  const totalFullScore = assignments?.reduce((total, item) => total + item.full_score, 0) ?? 0;

  return (
    <>
      <Card
        sx={{
          mb: 3,
          overflow: 'hidden',
          border: (theme) => `1px solid ${theme.vars.palette.divider}`,
          boxShadow: (theme) =>
            `0 12px 32px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.08)}`,
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            gap: 2,
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.06),
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'grid',
                flexShrink: 0,
                borderRadius: 1.5,
                color: 'primary.main',
                placeItems: 'center',
                bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.14),
              }}
            >
              <Iconify icon="solar:chart-square-outline" width={28} />
            </Box>
            <Box>
              <Typography variant="h5">จัดการคะแนน</Typography>
              <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
                เลือกประเภทคะแนน แล้วเพิ่มรายการหรือกรอกคะแนนนักเรียนได้ทันที
              </Typography>
            </Box>
          </Box>

          <Box sx={{ gap: 1, display: 'flex', width: { xs: 1, sm: 'auto' } }}>
            <Box
              sx={{
                px: 2,
                py: 1,
                flex: { xs: 1, sm: 'none' },
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: (theme) => `1px solid ${theme.vars.palette.divider}`,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                รายการทั้งหมด
              </Typography>
              <Typography variant="h6">{assignments?.length ?? 0} รายการ</Typography>
            </Box>
            <Box
              sx={{
                px: 2,
                py: 1,
                flex: { xs: 1, sm: 'none' },
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: (theme) => `1px solid ${theme.vars.palette.divider}`,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                คะแนนเต็มรวม
              </Typography>
              <Typography variant="h6">{totalFullScore} คะแนน</Typography>
            </Box>
          </Box>
        </Box>

        <Box
          role="tablist"
          aria-label="ประเภทคะแนน"
          sx={{
            p: 2,
            gap: 1,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, 1fr)' },
          }}
        >
          {SCORE_CATEGORY_ORDER.map((category) => (
            <Box
              key={category}
              component="button"
              role="tab"
              type="button"
              aria-selected={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              sx={{
                p: 1.5,
                gap: 1,
                minWidth: 0,
                borderRadius: 1.5,
                cursor: 'pointer',
                textAlign: 'left',
                font: 'inherit',
                display: 'flex',
                alignItems: 'center',
                color: selectedCategory === category ? 'primary.contrastText' : 'text.primary',
                border: (theme) =>
                  `1px solid ${
                    selectedCategory === category
                      ? theme.vars.palette.primary.main
                      : theme.vars.palette.divider
                  }`,
                bgcolor: selectedCategory === category ? 'primary.main' : 'background.paper',
                transition: (theme) =>
                  theme.transitions.create(['background-color', 'border-color']),
                '&:hover': {
                  bgcolor: selectedCategory === category ? 'primary.dark' : 'action.hover',
                },
                '&:focus-visible': {
                  outline: (theme) =>
                    `3px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.3)}`,
                  outlineOffset: 2,
                },
                '&:last-of-type': { gridColumn: { xs: '1 / -1', md: 'auto' } },
              }}
            >
              <Iconify icon={SCORE_CATEGORY_ICON[category]} width={24} sx={{ flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="subtitle2" noWrap>
                  {ASSIGNMENT_CATEGORY_META[category].label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    opacity: selectedCategory === category ? 0.8 : 1,
                    color: selectedCategory === category ? 'inherit' : 'text.secondary',
                  }}
                >
                  {assignments?.filter((item) => item.category === category).length ?? 0} รายการ
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Card>

      <ScoreCategorySection
        category={selectedCategory}
        items={categoryItems}
        loading={assignmentsLoading}
        gradebookPath={gradebookPath}
        createPath={scoreCategoryNewPath(selectedCategory)}
        onQuickCreate={(value) => setQuickCategory(value)}
        onEdit={(assignment) => setScoreItemAction({ mode: 'edit', assignment })}
        onDelete={(assignment) => setScoreItemAction({ mode: 'delete', assignment })}
      />

      {quickCategory && (
        <QuickScoreDialog
          key={quickCategory}
          open
          category={quickCategory}
          teacherAssignmentId={teacherAssignmentId}
          gradebookPath={gradebookPath}
          onClose={() => setQuickCategory(null)}
        />
      )}

      {scoreItemAction && (
        <ScoreItemActionsDialog
          key={`${scoreItemAction.mode}-${scoreItemAction.assignment.id}`}
          open
          mode={scoreItemAction.mode}
          assignment={scoreItemAction.assignment}
          teacherAssignmentId={teacherAssignmentId}
          onClose={() => setScoreItemAction(null)}
        />
      )}
    </>
  );
}

type ScoreCategorySectionProps = {
  category: AssignmentCategory;
  items: Assignment[];
  loading: boolean;
  gradebookPath: (assignmentId: string) => string;
  createPath: string;
  onQuickCreate: (category: Exclude<AssignmentCategory, 'assignment'>) => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
};

function ScoreCategorySection({
  category,
  items,
  loading,
  gradebookPath,
  createPath,
  onQuickCreate,
  onEdit,
  onDelete,
}: ScoreCategorySectionProps) {
  const meta = ASSIGNMENT_CATEGORY_META[category];
  const canCreate = !meta.singleton || items.length === 0;
  const hasDueDate = category === 'assignment';
  const colSpan = hasDueDate ? 5 : 4;

  return (
    <Card
      variant="outlined"
      sx={{
        overflow: 'hidden',
        borderColor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.2),
      }}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              display: 'grid',
              flexShrink: 0,
              borderRadius: 1.5,
              color: 'primary.main',
              placeItems: 'center',
              bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
            }}
          >
            <Iconify icon={SCORE_CATEGORY_ICON[category]} width={26} />
          </Box>
          <Box>
            <Box sx={{ gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h6">{meta.sectionTitle}</Typography>
              <Label color="primary">{items.length} รายการ</Label>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {meta.description}
            </Typography>
          </Box>
        </Box>
        {canCreate && category === 'assignment' && (
          <Button
            component={RouterLink}
            href={createPath}
            variant="contained"
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{ flexShrink: 0, width: { xs: 1, sm: 'auto' } }}
          >
            {meta.singleton ? 'เพิ่มคะแนน' : `เพิ่ม${meta.label}`}
          </Button>
        )}
        {canCreate && category !== 'assignment' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => onQuickCreate(category)}
            sx={{ flexShrink: 0, width: { xs: 1, sm: 'auto' } }}
          >
            {meta.singleton ? 'กรอกคะแนน' : 'เพิ่มรายการคะแนน'}
          </Button>
        )}
      </Box>
      <Divider />
      <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ชื่อรายการ</TableCell>
              <TableCell>รายละเอียด</TableCell>
              {hasDueDate && <TableCell>กำหนดส่ง</TableCell>}
              <TableCell align="center">คะแนนเต็ม</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={colSpan}>กำลังโหลด...</TableCell>
              </TableRow>
            )}
            {!loading && !items.length && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}
                >
                  ยังไม่มี{meta.sectionTitle}
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="subtitle2">{item.title}</Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ maxWidth: 320, color: 'text.secondary' }}
                  >
                    {item.description || 'ไม่มีรายละเอียด'}
                  </Typography>
                </TableCell>
                {hasDueDate && (
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                      {item.due_at ? fDateTime(item.due_at, 'DD/MM/YYYY HH:mm') : 'ไม่กำหนด'}
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">{item.full_score}</TableCell>
                <TableCell align="right">
                  <Box sx={{ gap: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      component={RouterLink}
                      href={gradebookPath(item.id)}
                      size="small"
                      variant="outlined"
                      startIcon={<Iconify icon="solar:pen-bold" />}
                    >
                      กรอกคะแนน
                    </Button>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label={`แก้ไข ${item.title}`}
                      title="แก้ไขรายการ"
                      onClick={() => onEdit(item)}
                    >
                      <Iconify icon="solar:settings-bold" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`ลบ ${item.title}`}
                      title="ลบรายการ"
                      onClick={() => onDelete(item)}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        {loading && (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={112} />
          </Box>
        )}
        {!loading && !items.length && (
          <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
            <Iconify
              icon={SCORE_CATEGORY_ICON[category]}
              width={44}
              sx={{ mb: 1, color: 'text.disabled' }}
            />
            <Typography variant="subtitle2">ยังไม่มี{meta.sectionTitle}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              เพิ่มรายการแรกเพื่อเริ่มกรอกคะแนนนักเรียน
            </Typography>
          </Box>
        )}
        {items.map((item) => (
          <Box
            key={item.id}
            sx={{
              p: 2,
              gap: 1.5,
              display: 'flex',
              flexDirection: 'column',
              borderTop: (theme) => `1px solid ${theme.vars.palette.divider}`,
            }}
          >
            <Box sx={{ gap: 1, display: 'flex', alignItems: 'flex-start' }}>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="subtitle2">{item.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {item.description || 'ไม่มีรายละเอียด'}
                </Typography>
              </Box>
              <Label color="primary">เต็ม {item.full_score}</Label>
            </Box>
            {hasDueDate && (
              <Box
                sx={{ gap: 0.75, display: 'flex', alignItems: 'center', color: 'text.secondary' }}
              >
                <Iconify icon="solar:calendar-date-bold" width={18} />
                <Typography variant="caption">
                  กำหนดส่ง {item.due_at ? fDateTime(item.due_at, 'DD/MM/YYYY HH:mm') : 'ไม่กำหนด'}
                </Typography>
              </Box>
            )}
            <Box sx={{ gap: 1, display: 'grid', gridTemplateColumns: '1fr auto auto' }}>
              <Button
                component={RouterLink}
                href={gradebookPath(item.id)}
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" />}
              >
                กรอกคะแนน
              </Button>
              <IconButton
                color="primary"
                aria-label={`แก้ไข ${item.title}`}
                onClick={() => onEdit(item)}
                sx={{ border: (theme) => `1px solid ${theme.vars.palette.divider}` }}
              >
                <Iconify icon="solar:settings-bold" />
              </IconButton>
              <IconButton
                color="error"
                aria-label={`ลบ ${item.title}`}
                onClick={() => onDelete(item)}
                sx={{ border: (theme) => `1px solid ${theme.vars.palette.divider}` }}
              >
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>
    </Card>
  );
}
