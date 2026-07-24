'use client';

import type { UserRow } from 'src/sections/user/user-actions';
import type { HomeroomEnrollment } from '../teacher-students-actions';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { listUsers } from 'src/sections/user/user-actions';
import { useSchoolSubscription } from 'src/sections/school-subscription/use-school-subscription';

import { useAuthContext } from 'src/auth/hooks';

import { HomeroomAttendanceSection } from '../components/homeroom-attendance-section';
import {
  getMyHomeroomStudents,
  addMyHomeroomStudents,
  updateMyHomeroomStudent,
  removeMyHomeroomStudent,
} from '../teacher-students-actions';

// ----------------------------------------------------------------------

const StudentQrDialog = dynamic(
  () => import('../components/student-qr-dialog').then((module) => module.StudentQrDialog),
  { ssr: false }
);

const STATUS_LABEL = {
  studying: 'กำลังศึกษา',
  graduated: 'สำเร็จการศึกษา',
  transferred: 'ย้ายโรงเรียน',
  withdrawn: 'ลาออก',
  dismissed: 'พ้นสภาพ',
} as const;

export function TeacherStudentsView() {
  const { user } = useAuthContext();
  const subscriptionQuery = useSchoolSubscription(user?.school_id);
  const queryClient = useQueryClient();
  const [classroomId, setClassroomId] = useState('');
  const [section, setSection] = useState<'students' | 'attendance'>('students');
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<UserRow[]>([]);
  const [editingRow, setEditingRow] = useState<HomeroomEnrollment | null>(null);
  const [studentNumber, setStudentNumber] = useState('');
  const [deletingRow, setDeletingRow] = useState<HomeroomEnrollment | null>(null);
  const [qrRow, setQrRow] = useState<HomeroomEnrollment | null>(null);
  const canUseQr =
    subscriptionQuery.data?.subscription.enabled_features.includes('teacher.qr_attendance') ??
    false;

  const {
    data = { classrooms: [], enrollments: [] },
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['teacher-homeroom-students', user?.school_id, user?.id],
    queryFn: getMyHomeroomStudents,
    enabled: !!user?.school_id && !!user?.id,
  });
  const { data: schoolStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['users', 'student', user?.school_id],
    queryFn: () => listUsers('student'),
    enabled: addDialogOpen && !!user?.school_id,
  });

  const selectedClassroom =
    data.classrooms.find((classroom) => classroom.id === classroomId) ?? data.classrooms[0] ?? null;
  const resolvedClassroomId = selectedClassroom?.id ?? '';
  const roster = data.enrollments.filter(
    (enrollment) => enrollment.classroom_id === resolvedClassroomId
  );
  const filteredRoster = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');
    if (!keyword) return roster;
    return roster.filter((row) =>
      [
        row.student.student_code,
        row.student.username,
        row.student.first_name,
        row.student.last_name,
        row.student.nickname,
        row.student_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(keyword)
    );
  }, [roster, search]);

  const existingStudentIds = new Set(data.enrollments.map((row) => row.student.id));
  const availableStudents = schoolStudents.filter(
    (student) =>
      !existingStudentIds.has(student.id) &&
      student.is_active !== false &&
      (student.student_status ?? 'studying') === 'studying'
  );

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ['teacher-homeroom-students', user?.school_id, user?.id],
    });

  const addMutation = useMutation({
    mutationFn: () =>
      addMyHomeroomStudents(
        resolvedClassroomId,
        selectedStudents.map((student) => student.id)
      ),
    onSuccess: async () => {
      await refresh();
      setAddDialogOpen(false);
      setSelectedStudents([]);
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => updateMyHomeroomStudent(editingRow!.id, studentNumber),
    onSuccess: async () => {
      await refresh();
      setEditingRow(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: removeMyHomeroomStudent,
    onSuccess: async () => {
      await refresh();
      setDeletingRow(null);
    },
  });

  const openEdit = (row: HomeroomEnrollment) => {
    updateMutation.reset();
    setEditingRow(row);
    setStudentNumber(row.student_number ?? '');
  };

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
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
            นักเรียนของฉัน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            รายชื่อนักเรียนในชั้นที่คุณเป็นครูประจำชั้น
          </Typography>
        </Box>
        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            href={paths.teacher.attendanceHistory}
            variant="outlined"
            startIcon={<Iconify icon="solar:calendar-date-bold" />}
          >
            ประวัติการเข้าแถว
          </Button>
          {canUseQr && (
            <Button
              component={RouterLink}
              href={paths.teacher.attendanceScan}
              variant="outlined"
              startIcon={<Iconify icon="solar:camera-add-bold" />}
            >
              สแกน QR
            </Button>
          )}
          {section === 'students' && (
            <Button
              variant="contained"
              disabled={!selectedClassroom}
              onClick={() => {
                addMutation.reset();
                setSelectedStudents([]);
                setAddDialogOpen(true);
              }}
              startIcon={<Iconify icon="solar:user-plus-bold" />}
            >
              เพิ่มนักเรียนเข้าชั้น
            </Button>
          )}
        </Box>
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
          sx={{ mb: 3 }}
        >
          ไม่สามารถโหลดรายชื่อนักเรียนได้
        </Alert>
      )}

      {!isLoading && !data.classrooms.length && (
        <Alert severity="info">
          คุณยังไม่ได้รับมอบหมายเป็นครูประจำชั้น กรุณาติดต่อผู้ดูแลโรงเรียน
        </Alert>
      )}

      {!!data.classrooms.length && (
        <>
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
            <TextField
              select
              size="small"
              label="ชั้นเรียน"
              value={resolvedClassroomId}
              onChange={(event) => {
                setClassroomId(event.target.value);
                setSearch('');
              }}
              sx={{ width: { xs: 1, sm: 320 } }}
            >
              {data.classrooms.map((classroom) => {
                const studentCount = data.enrollments.filter(
                  (row) => row.classroom_id === classroom.id
                ).length;
                return (
                  <MenuItem key={classroom.id} value={classroom.id}>
                    {classroom.name} · ปี {classroom.academic_years?.year ?? '-'} · {studentCount}{' '}
                    คน
                  </MenuItem>
                );
              })}
            </TextField>

            <Box
              sx={{
                p: 0.5,
                gap: 0.5,
                display: 'flex',
                borderRadius: 1.5,
                bgcolor: 'background.neutral',
              }}
            >
              <Button
                size="small"
                variant={section === 'students' ? 'contained' : 'text'}
                color={section === 'students' ? 'primary' : 'inherit'}
                onClick={() => setSection('students')}
                startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                รายชื่อนักเรียน ({roster.length})
              </Button>
              <Button
                size="small"
                variant={section === 'attendance' ? 'contained' : 'text'}
                color={section === 'attendance' ? 'primary' : 'inherit'}
                onClick={() => setSection('attendance')}
                startIcon={<Iconify icon="solar:check-circle-bold" />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                เช็คชื่อเข้าแถว
              </Button>
            </Box>
          </Box>

          {section === 'students' && (
            <Card variant="outlined">
              <Box
                sx={{
                  p: 2.5,
                  gap: 2,
                  display: 'flex',
                  alignItems: { xs: 'stretch', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="h6">{selectedClassroom?.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {filteredRoster.length} คน
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหารหัส ชื่อ หรือเลขที่"
                  sx={{ width: { xs: 1, sm: 300 } }}
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

              <TableContainer>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>นักเรียน</TableCell>
                      <TableCell>รหัสนักเรียน</TableCell>
                      <TableCell>ชื่อผู้ใช้งาน</TableCell>
                      <TableCell>เลขที่</TableCell>
                      <TableCell>สถานะ</TableCell>
                      <TableCell align="right">จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={6}>กำลังโหลด...</TableCell>
                      </TableRow>
                    )}
                    {!isLoading && !filteredRoster.length && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                        >
                          ยังไม่มีนักเรียนในชั้นนี้
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRoster.map((row) => {
                      const name =
                        `${row.student.first_name ?? ''} ${row.student.last_name ?? ''}`.trim() ||
                        row.student.username;
                      const status = row.student.student_status ?? 'studying';
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
                              <Avatar src={row.student.avatar_url ?? undefined}>
                                {name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">{name}</Typography>
                                {row.student.nickname && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    ชื่อเล่น {row.student.nickname}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{row.student.student_code ?? '-'}</TableCell>
                          <TableCell>@{row.student.username}</TableCell>
                          <TableCell>{row.student_number ?? '-'}</TableCell>
                          <TableCell>
                            <Label
                              variant="soft"
                              color={status === 'studying' ? 'success' : 'warning'}
                            >
                              {STATUS_LABEL[status]}
                            </Label>
                          </TableCell>
                          <TableCell align="right">
                            {canUseQr && (
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={!row.student.is_active || status !== 'studying'}
                                onClick={() => setQrRow(row)}
                                aria-label={`ดู QR ของ ${name}`}
                              >
                                <Iconify icon="solar:user-id-bold" width={18} />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => openEdit(row)}
                              aria-label={`แก้ไขเลขที่ของ ${name}`}
                            >
                              <Iconify icon="solar:pen-bold" width={18} />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                deleteMutation.reset();
                                setDeletingRow(row);
                              }}
                              aria-label={`นำ ${name} ออกจากชั้น`}
                            >
                              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {section === 'attendance' && selectedClassroom && (
            <HomeroomAttendanceSection
              key={selectedClassroom.id}
              classroomId={selectedClassroom.id}
              classroomName={selectedClassroom.name}
            />
          )}
        </>
      )}

      {qrRow && (
        <StudentQrDialog
          open
          student={qrRow.student}
          classroomName={selectedClassroom?.name}
          academicYear={selectedClassroom?.academic_years?.year}
          onClose={() => setQrRow(null)}
        />
      )}

      <Dialog
        open={addDialogOpen}
        onClose={() => !addMutation.isPending && setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>เพิ่มนักเรียนเข้า {selectedClassroom?.name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {addMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addMutation.error.message}
            </Alert>
          )}
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={availableStudents}
            value={selectedStudents}
            loading={studentsLoading}
            getOptionLabel={(option) =>
              `${option.first_name ?? ''} ${option.last_name ?? ''}`.trim() || option.username
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, value) => setSelectedStudents(value)}
            noOptionsText="ไม่พบนักเรียนที่สามารถเพิ่มได้"
            renderInput={(params) => (
              <TextField
                {...params}
                label="นักเรียน"
                placeholder={selectedStudents.length ? '' : 'เลือกนักเรียนหลายคน'}
                helperText={`เลือกแล้ว ${selectedStudents.length} คน`}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={addMutation.isPending}
            onClick={() => setAddDialogOpen(false)}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={!selectedStudents.length}
            loading={addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            เพิ่ม {selectedStudents.length} คน
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editingRow}
        onClose={() => !updateMutation.isPending && setEditingRow(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>แก้ไขเลขที่</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {updateMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {updateMutation.error.message}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="เลขที่"
            value={studentNumber}
            onChange={(event) => setStudentNumber(event.target.value)}
            error={!!studentNumber && !/^\d+$/.test(studentNumber)}
            helperText="กรอกตัวเลข หรือเว้นว่างหากยังไม่กำหนด"
            slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={updateMutation.isPending}
            onClick={() => setEditingRow(null)}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            loading={updateMutation.isPending}
            disabled={!!studentNumber && !/^\d+$/.test(studentNumber)}
            onClick={() => updateMutation.mutate()}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deletingRow}
        onClose={() => !deleteMutation.isPending && setDeletingRow(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>นำนักเรียนออกจากชั้น</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Typography>
            ยืนยันนำนักเรียนออกจาก {selectedClassroom?.name} การดำเนินการนี้จะลบการลงทะเบียนในชั้น
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={deleteMutation.isPending}
            onClick={() => setDeletingRow(null)}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingRow && deleteMutation.mutate(deletingRow.id)}
          >
            นำออกจากชั้น
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
