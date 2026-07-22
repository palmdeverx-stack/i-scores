'use client';

import * as z from 'zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Box, Stack } from '@mui/material';
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

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';

import { listUsers } from 'src/sections/user/user-actions';
import { listClassrooms } from 'src/sections/classroom/classroom-actions';

import { BulkPromoteDialog } from '../components/bulk-promote-dialog';
import { listEnrollments, createEnrollment } from '../enrollment-actions';
import { StudentProgressDialog } from '../components/student-progress-dialog';

// ----------------------------------------------------------------------

const CreateSchema = z.object({
  studentId: z.string().min(1, { error: 'กรุณาเลือกนักเรียน!' }),
  classroomId: z.string().min(1, { error: 'กรุณาเลือกห้องเรียน!' }),
  studentNumber: z
    .string()
    .trim()
    .refine((value) => !value || /^\d+$/.test(value), { error: 'เลขที่ต้องเป็นตัวเลขเท่านั้น!' }),
});

export function EnrollmentListView() {
  const table = useTable({ defaultRowsPerPage: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [progressEnrollmentId, setProgressEnrollmentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const queryClient = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['enrollments'], queryFn: () => listEnrollments() });
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['users', 'student'],
    queryFn: () => listUsers('student'),
  });
  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => listClassrooms(),
  });

  const methods = useForm({
    resolver: zodResolver(CreateSchema),
    defaultValues: { studentId: '', classroomId: '', studentNumber: '' },
  });
  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = methods;
  const studentId = useWatch({ control, name: 'studentId' });
  const classroomId = useWatch({ control, name: 'classroomId' });
  const selectedStudent = students.find((student) => student.id === studentId) ?? null;
  const selectedClassroom = classrooms.find((classroom) => classroom.id === classroomId) ?? null;

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');

    return rows.filter((row) => {
      const name = `${row.student.first_name ?? ''} ${row.student.last_name ?? ''}`;
      const matchesSearch =
        !keyword ||
        [name, row.student.username, row.classroom.name, row.student_number]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('th')
          .includes(keyword);
      const matchesClassroom = classroomFilter === 'all' || row.classroom.id === classroomFilter;

      return matchesSearch && matchesClassroom;
    });
  }, [classroomFilter, rows, search]);

  const visibleRows = rowInPage(filteredRows, table.page, table.rowsPerPage);

  const summary = useMemo(
    () => ({
      enrollments: rows.length,
      students: new Set(rows.map((row) => row.student.id)).size,
      classrooms: new Set(rows.map((row) => row.classroom.id)).size,
    }),
    [rows]
  );

  const createMutation = useMutation({
    mutationFn: createEnrollment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      setDialogOpen(false);
      reset();
    },
  });

  const closeDialog = () => {
    if (createMutation.isPending) return;
    setDialogOpen(false);
    reset();
    createMutation.reset();
  };

  const onSubmit = handleSubmit((data) =>
    createMutation.mutate({
      studentId: data.studentId,
      classroomId: data.classroomId,
      studentNumber: data.studentNumber.trim() || undefined,
    })
  );

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
            จัดนักเรียนเข้าห้องเรียนและกำหนดเลขที่
          </Typography>
        </Box>
        <Box sx={{ gap: 1.5, display: 'flex' }}>
          <Button
            variant="outlined"
            onClick={() => setPromoteDialogOpen(true)}
            startIcon={<Iconify icon="solar:double-alt-arrow-up-bold-duotone" />}
          >
            เลื่อนชั้นยกชุด
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              reset();
              createMutation.reset();
              setDialogOpen(true);
            }}
            startIcon={<Iconify icon="solar:user-plus-bold" />}
          >
            เพิ่มนักเรียน
          </Button>
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
          ไม่สามารถโหลดรายการลงทะเบียนได้
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
          icon="solar:user-plus-bold"
          label="การลงทะเบียนทั้งหมด"
          value={summary.enrollments}
          color="success.main"
          bgcolor="success.lighter"
        />
        <SummaryCard
          icon="solar:user-rounded-bold"
          label="นักเรียน"
          value={summary.students}
          color="primary.main"
          bgcolor="primary.lighter"
        />
        <SummaryCard
          icon="solar:users-group-rounded-bold"
          label="ห้องเรียน"
          value={summary.classrooms}
          color="warning.main"
          bgcolor="warning.lighter"
        />
      </Box>

      <Card variant="outlined">
        <Box
          sx={{
            gap: 2,
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: { xs: 'stretch', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography component="h2" variant="h6">
              รายชื่อนักเรียน
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isLoading ? 'กำลังโหลด...' : `พบ ${filteredRows.length} รายการ`}
            </Typography>
          </Box>
          <Box sx={{ gap: 1.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              size="small"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                table.onResetPage();
              }}
              placeholder="ค้นหานักเรียนหรือเลขที่"
              aria-label="ค้นหารายการลงทะเบียน"
              sx={{ width: { xs: 1, sm: 270 } }}
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
            <TextField
              select
              size="small"
              label="ห้องเรียน"
              value={classroomFilter}
              onChange={(event) => {
                setClassroomFilter(event.target.value);
                table.onResetPage();
              }}
              sx={{ minWidth: { xs: 1, sm: 180 } }}
            >
              <MenuItem value="all">ทุกห้องเรียน</MenuItem>
              {classrooms.map((classroom) => (
                <MenuItem key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>นักเรียน</TableCell>
                <TableCell>ชื่อผู้ใช้งาน</TableCell>
                <TableCell>ห้องเรียน</TableCell>
                <TableCell>เลขที่</TableCell>
                <TableCell align="right">ข้อมูลการเรียน</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !filteredRows.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    {rows.length ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'ยังไม่มีนักเรียนในห้อง'}
                  </TableCell>
                </TableRow>
              )}
              {visibleRows.map((row) => {
                const studentName =
                  `${row.student.first_name ?? ''} ${row.student.last_name ?? ''}`.trim() ||
                  row.student.username;

                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: 'primary.lighter',
                            color: 'primary.main',
                            typography: 'subtitle2',
                          }}
                        >
                          {studentName.charAt(0).toUpperCase()}
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
                      <Chip
                        size="small"
                        variant="soft"
                        color="primary"
                        label={row.classroom.name}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{row.student_number ?? '-'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setProgressEnrollmentId(row.id)}
                        startIcon={<Iconify icon="solar:list-bold" />}
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

        <TablePaginationCustom
          page={table.page}
          count={filteredRows.length}
          rowsPerPage={table.rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          labelRowsPerPage="แสดงต่อหน้า"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
          getItemAriaLabel={(type) => {
            if (type === 'first') return 'หน้าแรก';
            if (type === 'last') return 'หน้าสุดท้าย';
            if (type === 'next') return 'หน้าถัดไป';
            return 'หน้าก่อนหน้า';
          }}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <Form methods={methods} onSubmit={onSubmit}>
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography component="h2" variant="h6">
                  เพิ่มนักเรียนเข้าห้อง
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  ค้นหานักเรียน เลือกห้อง และระบุเลขที่
                </Typography>
              </Box>
              <Box>
                <IconButton
                  onClick={closeDialog}
                  disabled={createMutation.isPending}
                  aria-label="ปิดหน้าต่าง"
                >
                  <Iconify icon="mingcute:close-line" />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack sx={{ mt: 2 }}>
              {createMutation.error && (
                <Alert severity="error" sx={{ mb: 2.5 }}>
                  {createMutation.error.message}
                </Alert>
              )}
              <Box sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
                <Autocomplete
                  options={students}
                  value={selectedStudent}
                  loading={studentsLoading}
                  getOptionLabel={(option) =>
                    `${option.first_name ?? ''} ${option.last_name ?? ''}`.trim() || option.username
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) =>
                    setValue('studentId', value?.id ?? '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  noOptionsText="ไม่พบนักเรียน"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="นักเรียน *"
                      placeholder="ค้นหาชื่อหรือชื่อผู้ใช้งาน"
                      error={!!errors.studentId}
                      helperText={errors.studentId?.message ?? 'นักเรียนที่ต้องการเพิ่มเข้าห้อง'}
                    />
                  )}
                />
                <Autocomplete
                  options={classrooms}
                  value={selectedClassroom}
                  loading={classroomsLoading}
                  getOptionLabel={(option) =>
                    option.academic_years?.year
                      ? `${option.name} · ${option.academic_years.year}`
                      : option.name
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) =>
                    setValue('classroomId', value?.id ?? '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  noOptionsText="ไม่พบห้องเรียน"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="ห้องเรียน *"
                      placeholder="ค้นหาห้องเรียน"
                      error={!!errors.classroomId}
                      helperText={errors.classroomId?.message ?? 'ห้องปลายทางของนักเรียน'}
                    />
                  )}
                />
                <Field.Text
                  name="studentNumber"
                  label="เลขที่"
                  placeholder="เช่น 12"
                  helperText="ไม่บังคับ"
                  slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                />
                {(selectedStudent || selectedClassroom) && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.neutral',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      สรุปก่อนเพิ่ม
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      นักเรียน:{' '}
                      <strong>
                        {selectedStudent
                          ? `${selectedStudent.first_name ?? ''} ${selectedStudent.last_name ?? ''}`.trim() ||
                            selectedStudent.username
                          : 'ยังไม่ได้เลือก'}
                      </strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      ห้องเรียน: <strong>{selectedClassroom?.name ?? 'ยังไม่ได้เลือก'}</strong>
                    </Typography>
                  </Box>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={closeDialog} disabled={createMutation.isPending}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={createMutation.isPending}>
              เพิ่มนักเรียน
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      <StudentProgressDialog
        enrollmentId={progressEnrollmentId}
        onClose={() => setProgressEnrollmentId(null)}
      />

      <BulkPromoteDialog
        open={promoteDialogOpen}
        onClose={() => setPromoteDialogOpen(false)}
        initialClassroomId={classroomFilter !== 'all' ? classroomFilter : undefined}
      />
    </Container>
  );
}

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

type SummaryCardProps = {
  icon: 'solar:user-plus-bold' | 'solar:user-rounded-bold' | 'solar:users-group-rounded-bold';
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
