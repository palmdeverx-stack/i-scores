'use client';

import type { Classroom } from '../classroom-actions';

import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Box, Stack } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { today, fIsBetween } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { listUsers } from 'src/sections/user/user-actions';
import { listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import {
  listClassrooms,
  createClassroom,
  deleteClassroom,
  updateClassroom,
} from '../classroom-actions';

// ----------------------------------------------------------------------

const CreateSchema = z.object({
  name: z.string().trim().min(1, { error: 'กรุณากรอกชื่อห้องเรียน!' }),
  gradeLevel: z.string().trim(),
  academicYearId: z.string().min(1, { error: 'กรุณาเลือกปีการศึกษา!' }),
  teacherIds: z.array(z.string()).min(1, { error: 'กรุณาเลือกครูประจำชั้นอย่างน้อย 1 คน!' }),
});

export function ClassroomListView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [deletingClassroom, setDeletingClassroom] = useState<Classroom | null>(null);
  const queryClient = useQueryClient();

  const {
    data: classrooms = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => listClassrooms(),
  });
  const {
    data: academicYears = [],
    isLoading: academicYearsLoading,
    isError: academicYearsError,
  } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  });
  const {
    data: teachers = [],
    isLoading: teachersLoading,
    isError: teachersError,
  } = useQuery({
    queryKey: ['users', 'teacher'],
    queryFn: () => listUsers('teacher'),
  });

  const methods = useForm({
    resolver: zodResolver(CreateSchema),
    defaultValues: { name: '', gradeLevel: '', academicYearId: '', teacherIds: [] as string[] },
  });
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = methods;
  const teacherIds = watch('teacherIds');
  const selectedTeachers = teachers.filter((teacher) => teacherIds.includes(teacher.id));

  const saveMutation = useMutation({
    mutationFn: (data: z.infer<typeof CreateSchema>) => {
      const params = {
        name: data.name.trim(),
        academicYearId: data.academicYearId,
        gradeLevel: data.gradeLevel.trim() || undefined,
        teacherIds: data.teacherIds,
      };
      return editingClassroom
        ? updateClassroom(editingClassroom.id, params)
        : createClassroom(params);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setDialogOpen(false);
      setEditingClassroom(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setDeletingClassroom(null);
    },
  });

  const openCreateDialog = () => {
    setEditingClassroom(null);
    reset({ name: '', gradeLevel: '', academicYearId: '', teacherIds: [] });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const openEditDialog = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    reset({
      name: classroom.name,
      gradeLevel: classroom.grade_level ?? '',
      academicYearId: classroom.academic_year_id,
      teacherIds: classroom.homeroom_teachers.map((teacher) => teacher.id),
    });
    saveMutation.reset();
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    setDialogOpen(false);
    setEditingClassroom(null);
    reset();
    saveMutation.reset();
  };

  const onSubmit = handleSubmit((data) => saveMutation.mutate(data));

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
            ห้องเรียน
          </Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการห้องเรียน ระดับชั้น และปีการศึกษา
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={openCreateDialog}
          startIcon={<Iconify icon="mingcute:add-line" />}
        >
          เพิ่มห้องเรียน
        </Button>
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
          ไม่สามารถโหลดรายการห้องเรียนได้
        </Alert>
      )}

      <Card variant="outlined">
        <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography component="h2" variant="h6">
            รายการห้องเรียน
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {isLoading ? 'กำลังโหลด...' : `${classrooms.length} รายการ`}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ชื่อห้อง</TableCell>
                <TableCell>ระดับชั้น</TableCell>
                <TableCell>ปีการศึกษา</TableCell>
                <TableCell>ครูประจำชั้น</TableCell>
                <TableCell align="right">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5}>กำลังโหลด...</TableCell>
                </TableRow>
              )}
              {!isLoading && !classrooms.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}
                  >
                    ยังไม่มีห้องเรียน กด “เพิ่มห้องเรียน” เพื่อเริ่มต้น
                  </TableCell>
                </TableRow>
              )}
              {classrooms.map((classroom) => (
                <TableRow key={classroom.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{classroom.name}</Typography>
                  </TableCell>
                  <TableCell>{classroom.grade_level ?? 'ไม่ระบุ'}</TableCell>
                  <TableCell>{classroom.academic_years?.year ?? '-'}</TableCell>
                  <TableCell>
                    {classroom.homeroom_teachers.length
                      ? classroom.homeroom_teachers
                          .map(
                            (teacher) =>
                              `${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() ||
                              teacher.username
                          )
                          .join(', ')
                      : 'ยังไม่ได้กำหนด'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="แก้ไข">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(classroom)}
                        aria-label={`แก้ไขห้อง ${classroom.name}`}
                      >
                        <Iconify icon="solar:pen-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          deleteMutation.reset();
                          setDeletingClassroom(classroom);
                        }}
                        aria-label={`ลบห้อง ${classroom.name}`}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <Form methods={methods} onSubmit={onSubmit}>
          <DialogTitle sx={{ pb: 1 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography component="h2" variant="h6">
                  {editingClassroom ? 'แก้ไขห้องเรียน' : 'เพิ่มห้องเรียน'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  {editingClassroom
                    ? 'ปรับข้อมูลห้องและปีการศึกษา'
                    : 'สร้างห้องเรียนใหม่และเชื่อมกับปีการศึกษา'}
                </Typography>
              </Box>
              <IconButton
                onClick={closeDialog}
                disabled={saveMutation.isPending}
                aria-label="ปิดหน้าต่าง"
              >
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            <Stack sx={{ mt: 2 }}>
              {saveMutation.error && (
                <Alert severity="error" sx={{ mb: 2.5 }}>
                  {saveMutation.error.message}
                </Alert>
              )}
              {academicYearsError && (
                <Alert severity="warning" sx={{ mb: 2.5 }}>
                  โหลดปีการศึกษาไม่สำเร็จ กรุณาปิดหน้าต่างแล้วลองใหม่
                </Alert>
              )}
              {teachersError && (
                <Alert severity="warning" sx={{ mb: 2.5 }}>
                  โหลดรายชื่อครูไม่สำเร็จ กรุณาปิดหน้าต่างแล้วลองใหม่
                </Alert>
              )}

              <Box
                sx={{
                  gap: 2.5,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                <Field.Select
                  name="academicYearId"
                  label="ปีการศึกษา *"
                  disabled={academicYearsLoading || academicYearsError}
                  helperText="ปีการศึกษาที่ห้องนี้เปิดใช้งาน"
                >
                  {academicYearsLoading && <MenuItem disabled>กำลังโหลด...</MenuItem>}
                  {!academicYearsLoading && !academicYears.length && (
                    <MenuItem disabled>ยังไม่มีปีการศึกษา</MenuItem>
                  )}
                  {academicYears.map((year) => (
                    <MenuItem key={year.id} value={year.id}>
                      {year.year}{' '}
                      {fIsBetween(today(), year.start_date, year.end_date) ? '(ปัจจุบัน)' : ''}
                    </MenuItem>
                  ))}
                </Field.Select>

                <Field.Text
                  name="name"
                  label="ชื่อห้องเรียน *"
                  placeholder="เช่น ม.1/1"
                  helperText="ชื่อที่ครูและนักเรียนจะเห็น"
                  autoFocus
                />

                <Field.Text
                  name="gradeLevel"
                  label="ระดับชั้น"
                  placeholder="เช่น มัธยมศึกษาปีที่ 1"
                  helperText="ไม่บังคับ"
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />

                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  filterSelectedOptions
                  options={teachers}
                  value={selectedTeachers}
                  loading={teachersLoading}
                  disabled={teachersLoading || teachersError}
                  getOptionLabel={(teacher) =>
                    `${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() ||
                    teacher.username
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) =>
                    setValue(
                      'teacherIds',
                      value.map((teacher) => teacher.id),
                      { shouldDirty: true, shouldValidate: true }
                    )
                  }
                  noOptionsText="ไม่พบรายชื่อครู"
                  loadingText="กำลังโหลดรายชื่อครู..."
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="ครูประจำชั้น *"
                      placeholder={selectedTeachers.length ? '' : 'เลือกได้มากกว่า 1 คน'}
                      error={!!errors.teacherIds}
                      helperText={errors.teacherIds?.message ?? 'เลือกครูประจำชั้นอย่างน้อย 1 คน'}
                    />
                  )}
                />
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button color="inherit" onClick={closeDialog} disabled={saveMutation.isPending}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" loading={saveMutation.isPending}>
              {editingClassroom ? 'บันทึกการแก้ไข' : 'เพิ่มห้องเรียน'}
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      <Dialog
        open={!!deletingClassroom}
        onClose={() => !deleteMutation.isPending && setDeletingClassroom(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบห้องเรียน</DialogTitle>
        <DialogContent>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
          <Typography variant="body2">
            ต้องการลบห้อง <strong>{deletingClassroom?.name}</strong> ใช่หรือไม่?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            รายชื่อนักเรียน การมอบหมายครู งาน และคะแนนที่เชื่อมกับห้องนี้อาจถูกลบตามไปด้วย
            และไม่สามารถย้อนกลับได้
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setDeletingClassroom(null)}
            disabled={deleteMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingClassroom && deleteMutation.mutate(deletingClassroom.id)}
          >
            ลบห้องเรียน
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
