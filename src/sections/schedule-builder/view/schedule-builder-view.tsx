'use client';

import type { ClassroomScheduleSlot, ClassroomScheduleAssignment } from '../schedule-builder-actions';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { RemixIcon } from 'src/components/remix-icon';

import { listUsers } from 'src/sections/user/user-actions';
import { listSubjects } from 'src/sections/subject/subject-actions';
import { listClassrooms } from 'src/sections/classroom/classroom-actions';
import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';
import {
  createTeacherAssignment,
  deleteTeacherAssignment,
} from 'src/sections/teacher-assignment/teacher-assignment-actions';

import { AssignmentFormDialog } from '../components/assignment-form-dialog';
import { ScheduleSlotFormDialog } from '../components/schedule-slot-form-dialog';
import { addScheduleSlot, deleteScheduleSlot, getClassroomSchedule } from '../schedule-builder-actions';

// ----------------------------------------------------------------------

const DAYS = [
  { value: 1, label: 'วันจันทร์', shortLabel: 'จ.' },
  { value: 2, label: 'วันอังคาร', shortLabel: 'อ.' },
  { value: 3, label: 'วันพุธ', shortLabel: 'พ.' },
  { value: 4, label: 'วันพฤหัสบดี', shortLabel: 'พฤ.' },
  { value: 5, label: 'วันศุกร์', shortLabel: 'ศ.' },
  { value: 6, label: 'วันเสาร์', shortLabel: 'ส.' },
  { value: 7, label: 'วันอาทิตย์', shortLabel: 'อา.' },
];

const ROW_HEIGHT = 92;
const SLOT_COLORS = ['primary', 'secondary', 'error', 'info', 'success', 'warning'] as const;

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function formatMinutes(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getSlotColor(id: string) {
  const hash = [...id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return SLOT_COLORS[hash % SLOT_COLORS.length];
}

export function ScheduleBuilderView() {
  const queryClient = useQueryClient();
  const [academicYearId, setAcademicYearId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingSlot, setDeletingSlot] = useState<ClassroomScheduleSlot | null>(null);
  const [addAssignmentDialogOpen, setAddAssignmentDialogOpen] = useState(false);
  const [deletingAssignment, setDeletingAssignment] =
    useState<ClassroomScheduleAssignment | null>(null);

  const academicYearsQuery = useQuery({
    queryKey: ['schedule-builder-academic-years'],
    queryFn: listAcademicYears,
  });

  useEffect(() => {
    if (academicYearId || !academicYearsQuery.data?.length) return;
    const active = academicYearsQuery.data.find((year) => year.is_active);
    setAcademicYearId((active ?? academicYearsQuery.data[0]).id);
  }, [academicYearId, academicYearsQuery.data]);

  const semestersQuery = useQuery({
    queryKey: ['schedule-builder-semesters', academicYearId],
    queryFn: () => listSemesters(academicYearId),
    enabled: !!academicYearId,
  });

  useEffect(() => {
    setSemesterId('');
  }, [academicYearId]);

  useEffect(() => {
    if (semesterId || !semestersQuery.data?.length) return;
    const active = semestersQuery.data.find((semester) => semester.is_active);
    setSemesterId((active ?? semestersQuery.data[0]).id);
  }, [semesterId, semestersQuery.data]);

  const classroomsQuery = useQuery({
    queryKey: ['schedule-builder-classrooms', academicYearId],
    queryFn: () => listClassrooms({ academicYearId }),
    enabled: !!academicYearId,
  });

  useEffect(() => {
    setClassroomId('');
  }, [academicYearId]);

  const scheduleQuery = useQuery({
    queryKey: ['classroom-schedule', classroomId, semesterId],
    queryFn: () => getClassroomSchedule(classroomId, semesterId),
    enabled: !!classroomId && !!semesterId,
  });

  const addMutation = useMutation({
    mutationFn: addScheduleSlot,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['classroom-schedule', classroomId, semesterId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slot: ClassroomScheduleSlot) =>
      deleteScheduleSlot(slot.teacher_assignment_id, slot.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['classroom-schedule', classroomId, semesterId],
      });
      setDeletingSlot(null);
    },
  });

  const subjectsQuery = useQuery({
    queryKey: ['schedule-builder-subjects', semesterId],
    queryFn: () => listSubjects({ semesterId }),
    enabled: !!semesterId,
  });

  const teachersQuery = useQuery({
    queryKey: ['schedule-builder-teachers'],
    queryFn: () => listUsers('teacher'),
    enabled: !!classroomId,
  });

  const addAssignmentMutation = useMutation({
    mutationFn: (params: { subjectId: string; teacherId: string }) =>
      createTeacherAssignment({ ...params, classroomId, semesterId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['classroom-schedule', classroomId, semesterId],
      });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (assignment: ClassroomScheduleAssignment) =>
      deleteTeacherAssignment(assignment.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['classroom-schedule', classroomId, semesterId],
      });
      setDeletingAssignment(null);
    },
  });

  const schedules = useMemo(() => scheduleQuery.data?.schedules ?? [], [scheduleQuery.data]);
  const assignments = useMemo(() => scheduleQuery.data?.assignments ?? [], [scheduleQuery.data]);

  const assignmentById = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.id, assignment])),
    [assignments]
  );

  const grid = useMemo(() => {
    const slotsByDay = new Map<number, ClassroomScheduleSlot[]>();
    schedules.forEach((slot) => {
      slotsByDay.set(slot.day_of_week, [...(slotsByDay.get(slot.day_of_week) ?? []), slot]);
    });

    const startMinute =
      Math.floor(
        Math.min(8 * 60, ...schedules.map((slot) => timeToMinutes(slot.start_time))) / 60
      ) * 60;
    const endMinute =
      Math.ceil(Math.max(17 * 60, ...schedules.map((slot) => timeToMinutes(slot.end_time))) / 60) *
      60;
    const totalHours = Math.max(1, (endMinute - startMinute) / 60);
    const timeLabels = Array.from({ length: totalHours }, (_, index) => startMinute + index * 60);
    const visibleDays = DAYS.filter(
      (day) => day.value <= 5 || schedules.some((slot) => slot.day_of_week === day.value)
    );

    return { slotsByDay, visibleDays, timeLabels, startMinute, totalHours };
  }, [schedules]);

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          จัดตารางสอน
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          จัดคาบสอนของครูทุกคนในโรงเรียน โดยเลือกดูทีละห้องเรียน
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}
        >
          <TextField
            select
            label="ปีการศึกษา"
            value={academicYearId}
            onChange={(event) => setAcademicYearId(event.target.value)}
            disabled={academicYearsQuery.isLoading}
          >
            {(academicYearsQuery.data ?? []).map((year) => (
              <MenuItem key={year.id} value={year.id}>
                {year.year}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="ภาคเรียน"
            value={semesterId}
            onChange={(event) => setSemesterId(event.target.value)}
            disabled={!academicYearId || semestersQuery.isLoading}
          >
            {(semestersQuery.data ?? []).map((semester) => (
              <MenuItem key={semester.id} value={semester.id}>
                {semester.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="ห้องเรียน"
            value={classroomId}
            onChange={(event) => setClassroomId(event.target.value)}
            disabled={!academicYearId || classroomsQuery.isLoading}
          >
            {(classroomsQuery.data ?? []).map((classroom) => (
              <MenuItem key={classroom.id} value={classroom.id}>
                {classroom.grade_level ? `${classroom.grade_level} ` : ''}
                {classroom.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Card>

      {!classroomId || !semesterId ? (
        <Alert severity="info" icon={<RemixIcon icon="solar:calendar-date-bold" />}>
          เลือกปีการศึกษา ภาคเรียน และห้องเรียน เพื่อดูและจัดตารางสอน
        </Alert>
      ) : scheduleQuery.isLoading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : scheduleQuery.isError ? (
        <Alert severity="error">ไม่สามารถโหลดตารางสอนของห้องนี้ได้</Alert>
      ) : (
        <>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {scheduleQuery.data?.classroom.grade_level} {scheduleQuery.data?.classroom.name}
            </Typography>
            <Button
              variant="contained"
              startIcon={<RemixIcon icon="mingcute:add-line" />}
              onClick={() => setAddDialogOpen(true)}
              disabled={!assignments.length}
            >
              เพิ่มคาบสอน
            </Button>
          </Box>

          <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
            <Box
              sx={{
                mb: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="subtitle1">วิชาที่สอนในห้องนี้</Typography>
              <Button
                size="small"
                startIcon={<RemixIcon icon="mingcute:add-line" />}
                onClick={() => setAddAssignmentDialogOpen(true)}
              >
                เพิ่มวิชาที่สอน
              </Button>
            </Box>

            {!assignments.length ? (
              <Alert severity="warning">
                ห้องนี้ยังไม่มีครูประจำวิชาในภาคเรียนนี้ — กด “เพิ่มวิชาที่สอน” เพื่อกำหนดครูผู้สอน
              </Alert>
            ) : (
              <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
                {assignments.map((assignment) => {
                  const teacherName = `${assignment.teacher?.first_name ?? ''} ${assignment.teacher?.last_name ?? ''}`.trim();
                  return (
                    <Chip
                      key={assignment.id}
                      variant="soft"
                      label={`${assignment.subject?.name ?? 'ไม่ระบุวิชา'} · ครู${teacherName || '-'}`}
                      onDelete={() => setDeletingAssignment(assignment)}
                      deleteIcon={
                        <Tooltip title="ลบวิชานี้ออกจากห้อง">
                          <RemixIcon icon="solar:trash-bin-trash-bold" width={16} />
                        </Tooltip>
                      }
                    />
                  );
                })}
              </Box>
            )}
          </Card>

          <Card variant="outlined" sx={{ overflow: 'hidden', borderRadius: 3 }}>
            <Box sx={{ width: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 640 }}>
                <Box
                  sx={{
                    height: 58,
                    display: 'grid',
                    gridTemplateColumns: '104px minmax(0, 1fr)',
                    bgcolor: 'background.neutral',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      display: 'flex',
                      alignItems: 'center',
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="subtitle2">วัน / เวลา</Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${grid.totalHours}, minmax(0, 1fr))`,
                    }}
                  >
                    {grid.timeLabels.map((minute) => (
                      <Box
                        key={minute}
                        sx={{
                          px: 1,
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {formatMinutes(minute)} น.
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {grid.visibleDays.map((day) => {
                  const daySlots = [...(grid.slotsByDay.get(day.value) ?? [])].sort((a, b) =>
                    a.start_time.localeCompare(b.start_time)
                  );

                  return (
                    <Box
                      key={day.value}
                      sx={{
                        height: ROW_HEIGHT,
                        display: 'grid',
                        gridTemplateColumns: '104px minmax(0, 1fr)',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 0 },
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="subtitle2">{day.label}</Typography>
                      </Box>

                      <Box
                        sx={{
                          position: 'relative',
                          backgroundSize: `${100 / grid.totalHours}% 100%`,
                          backgroundImage: (theme) =>
                            `linear-gradient(to right, transparent calc(100% - 1px), ${theme.vars.palette.divider} calc(100% - 1px))`,
                        }}
                      >
                        {!daySlots.length && (
                          <Typography
                            variant="caption"
                            sx={{
                              top: '50%',
                              left: 20,
                              position: 'absolute',
                              color: 'text.disabled',
                              transform: 'translateY(-50%)',
                            }}
                          >
                            ไม่มีคาบสอน
                          </Typography>
                        )}

                        {daySlots.map((slot) => {
                          const start = timeToMinutes(slot.start_time);
                          const end = timeToMinutes(slot.end_time);
                          const left = ((start - grid.startMinute) / (grid.totalHours * 60)) * 100;
                          const width = ((end - start) / (grid.totalHours * 60)) * 100;
                          const assignment = assignmentById.get(slot.teacher_assignment_id);
                          const color = getSlotColor(slot.teacher_assignment_id);
                          const teacherName = `${assignment?.teacher?.first_name ?? ''} ${assignment?.teacher?.last_name ?? ''}`.trim();

                          return (
                            <Card
                              key={slot.id}
                              onClick={() => setDeletingSlot(slot)}
                              title={`${assignment?.subject?.name ?? ''} ครู${teacherName} ${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)} น. — คลิกเพื่อลบ`}
                              sx={{
                                top: 10,
                                left: `calc(${left}% + 2px)`,
                                width: `calc(${width}% - 4px)`,
                                height: ROW_HEIGHT - 20,
                                px: 1,
                                py: 0.75,
                                cursor: 'pointer',
                                display: 'flex',
                                overflow: 'hidden',
                                position: 'absolute',
                                borderRadius: 1.5,
                                color: `${color}.darker`,
                                flexDirection: 'column',
                                justifyContent: 'center',
                                bgcolor: `${color}.lighter`,
                                border: '1px solid',
                                borderColor: `${color}.light`,
                                '&:hover': { boxShadow: (theme) => theme.shadows[8] },
                              }}
                            >
                              <Typography variant="subtitle2" noWrap sx={{ color: 'inherit', fontSize: '0.82rem' }}>
                                {assignment?.subject?.name ?? 'ไม่ระบุวิชา'}
                              </Typography>
                              <Typography variant="caption" noWrap sx={{ color: 'inherit', opacity: 0.82 }}>
                                ครู{teacherName || '-'}
                              </Typography>
                              <Typography variant="caption" noWrap sx={{ color: 'inherit', fontWeight: 700 }}>
                                {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} น.
                              </Typography>
                            </Card>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Card>
        </>
      )}

      <ScheduleSlotFormDialog
        open={addDialogOpen}
        assignments={assignments}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={(params) => addMutation.mutateAsync(params).then(() => {})}
      />

      <AssignmentFormDialog
        open={addAssignmentDialogOpen}
        subjects={subjectsQuery.data ?? []}
        teachers={teachersQuery.data ?? []}
        onClose={() => setAddAssignmentDialogOpen(false)}
        onSubmit={(params) => addAssignmentMutation.mutateAsync(params).then(() => {})}
      />

      <Dialog
        open={!!deletingAssignment}
        onClose={() => !removeAssignmentMutation.isPending && setDeletingAssignment(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบวิชาที่สอน</DialogTitle>
        <DialogContent>
          {removeAssignmentMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {removeAssignmentMutation.error.message}
            </Alert>
          )}
          <Typography variant="body2">
            ต้องการลบวิชานี้ออกจากห้องเรียนใช่หรือไม่? คาบสอนที่จัดไว้ของวิชานี้จะถูกลบไปด้วย
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingAssignment(null)}
            disabled={removeAssignmentMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={removeAssignmentMutation.isPending}
            onClick={() => deletingAssignment && removeAssignmentMutation.mutate(deletingAssignment)}
          >
            ลบวิชานี้
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deletingSlot}
        onClose={() => !deleteMutation.isPending && setDeletingSlot(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบคาบสอน</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Typography variant="body2">ต้องการลบคาบสอนนี้ออกจากตารางใช่หรือไม่?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingSlot(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingSlot && deleteMutation.mutate(deletingSlot)}
          >
            ลบคาบสอน
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
