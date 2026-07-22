'use client';

import * as z from 'zod';
import { useMemo, useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CardActionArea from '@mui/material/CardActionArea';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { listUsers } from 'src/sections/user/user-actions';
import { listSubjects } from 'src/sections/subject/subject-actions';
import { listClassrooms } from 'src/sections/classroom/classroom-actions';
import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import { useAuthContext } from 'src/auth/hooks';

import { listTeacherAssignments, createTeacherAssignment } from '../teacher-assignment-actions';

// ----------------------------------------------------------------------

const summaryItems = [
  {
    key: 'classes',
    label: 'ชั้นเรียนทั้งหมด',
    icon: 'solar:notebook-bold-duotone',
    color: '#0B7A57',
  },
  { key: 'subjects', label: 'รายวิชา', icon: 'solar:notes-bold-duotone', color: '#3D5AFE' },
  {
    key: 'classrooms',
    label: 'ห้องเรียน',
    icon: 'solar:users-group-rounded-bold-duotone',
    color: '#E77817',
  },
  { key: 'semesters', label: 'ภาคเรียน', icon: 'solar:calendar-date-bold', color: '#8E4EC6' },
] as const;

const CreateSchema = z.object({
  teacherId: z.string().min(1, { error: 'กรุณาเลือกครูผู้สอน!' }),
  subjectId: z.string().min(1, { error: 'กรุณาเลือกรายวิชา!' }),
  classroomId: z.string().min(1, { error: 'กรุณาเลือกห้องเรียน!' }),
  academicYearId: z.string().min(1, { error: 'กรุณาเลือกปีการศึกษา!' }),
  semesterId: z.string().min(1, { error: 'กรุณาเลือกภาคเรียน!' }),
});

export function TeacherAssignmentListView() {
  const { user } = useAuthContext();
  const isTeacher = user?.role === 'teacher';
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const detailPath = (id: string) =>
    isTeacher ? paths.teacher.assignmentDetail(id) : paths.admin.teacherAssignment.detail(id);

  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: listTeacherAssignments,
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['users', 'teacher'],
    queryFn: () => listUsers('teacher'),
    enabled: !isTeacher,
  });
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => listSubjects(),
    enabled: !isTeacher,
  });
  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: listClassrooms,
    enabled: !isTeacher,
  });
  const { data: academicYears = [], isLoading: yearsLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
    enabled: !isTeacher,
  });

  const methods = useForm({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      teacherId: '',
      subjectId: '',
      classroomId: '',
      academicYearId: '',
      semesterId: '',
    },
  });
  const { handleSubmit, control, reset, setValue } = methods;
  const academicYearId = useWatch({ control, name: 'academicYearId' });
  const semesterId = useWatch({ control, name: 'semesterId' });
  const availableSubjects = subjects.filter((subject) => subject.semester_id === semesterId);
  const { data: semesters = [], isLoading: semestersLoading } = useQuery({
    queryKey: ['semesters', academicYearId],
    queryFn: () => listSemesters(academicYearId),
    enabled: !isTeacher && !!academicYearId,
  });

  useEffect(() => {
    setValue('semesterId', '');
    setValue('subjectId', '');
  }, [academicYearId, setValue]);

  useEffect(() => {
    setValue('subjectId', '');
  }, [semesterId, setValue]);

  const createMutation = useMutation({
    mutationFn: createTeacherAssignment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
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
      teacherId: data.teacherId,
      subjectId: data.subjectId,
      classroomId: data.classroomId,
      semesterId: data.semesterId,
    })
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th');

    if (!keyword) return rows;

    return rows.filter((row) => {
      const teacherName = `${row.teacher.first_name ?? ''} ${row.teacher.last_name ?? ''}`;
      const searchableText = [
        teacherName,
        row.teacher.username,
        row.subject.name,
        row.classroom.name,
        row.semester.name,
      ]
        .join(' ')
        .toLocaleLowerCase('th');

      return searchableText.includes(keyword);
    });
  }, [rows, search]);

  const summary = useMemo(
    () => ({
      classes: rows.length,
      subjects: new Set(rows.map((row) => row.subject.id)).size,
      classrooms: new Set(rows.map((row) => row.classroom.id)).size,
      semesters: new Set(rows.map((row) => row.semester.id)).size,
    }),
    [rows]
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Card
        sx={{
          mb: 4,
          p: { xs: 3, sm: 4 },
          color: 'common.white',
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(135deg, #123D2B 0%, #176B4D 100%)',
          '&::after': {
            width: 240,
            height: 240,
            content: '""',
            borderRadius: '50%',
            position: 'absolute',
            right: { xs: -150, sm: -80 },
            bottom: -150,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Box
          sx={{
            gap: 3,
            zIndex: 1,
            display: 'flex',
            position: 'relative',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              component="p"
              variant="overline"
              sx={{ mb: 0.5, opacity: 0.8, letterSpacing: 1.2 }}
            >
              พื้นที่จัดการชั้นเรียน
            </Typography>
            <Typography component="h1" variant="h3" sx={{ mb: 1 }}>
              {isTeacher ? 'รายวิชาที่รับผิดชอบ' : 'ครูประจำวิชา'}
            </Typography>
            <Typography sx={{ maxWidth: 600, color: 'rgba(255, 255, 255, 0.76)' }}>
              {isTeacher
                ? 'เลือกวิชาและห้องเรียน เพื่อสร้างงาน ตรวจสอบรายชื่อนักเรียน และบันทึกคะแนน'
                : 'จัดการครูผู้สอน รายวิชา และห้องเรียนที่ได้รับมอบหมาย'}
            </Typography>
          </Box>

          {!isTeacher && (
            <Button
              variant="contained"
              onClick={() => {
                reset();
                createMutation.reset();
                setDialogOpen(true);
              }}
              startIcon={<Iconify icon="mingcute:add-line" />}
              sx={{
                flexShrink: 0,
                color: 'primary.darker',
                bgcolor: 'common.white',
                '&:hover': { bgcolor: 'grey.200' },
              }}
            >
              เพิ่มครูประจำวิชา
            </Button>
          )}
        </Box>
      </Card>

      <Box
        sx={{
          mb: 4,
          gap: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        }}
      >
        {summaryItems.map((item) => (
          <Card key={item.key} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  display: 'grid',
                  borderRadius: 1.5,
                  placeItems: 'center',
                  color: item.color,
                  bgcolor: `${item.color}14`,
                }}
              >
                <Iconify icon={item.icon} width={25} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
                  {isLoading ? <Skeleton width={32} /> : summary[item.key]}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                  {item.label}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

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
          <Typography component="h2" variant="h5">
            ชั้นเรียนของฉัน
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {isLoading ? 'กำลังโหลดข้อมูล...' : `พบ ${filteredRows.length} ชั้นเรียน`}
          </Typography>
        </Box>

        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหารายวิชา ห้องเรียน หรือภาคเรียน"
          aria-label="ค้นหาชั้นเรียน"
          sx={{ width: { xs: 1, sm: 360 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={21} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} aria-label="ล้างคำค้นหา">
                    <Iconify icon="mingcute:close-line" width={19} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
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
          ไม่สามารถโหลดข้อมูลชั้นเรียนได้ กรุณาลองใหม่อีกครั้ง
        </Alert>
      )}

      {isLoading ? (
        <Box
          aria-label="กำลังโหลดชั้นเรียน"
          sx={{
            gap: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="rounded" height={235} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            gap: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {filteredRows.map((row) => {
            const teacherName =
              `${row.teacher.first_name ?? ''} ${row.teacher.last_name ?? ''}`.trim() ||
              row.teacher.username;

            return (
              <Card
                key={row.id}
                variant="outlined"
                sx={{
                  height: 1,
                  transition:
                    'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main',
                    boxShadow: '0 14px 32px rgba(18, 61, 43, 0.12)',
                  },
                  '&:focus-within': { outline: '3px solid', outlineColor: 'primary.lighter' },
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  href={detailPath(row.id)}
                  aria-label={`เปิดรายวิชา ${row.subject.name} ห้อง ${row.classroom.name}`}
                  sx={{ height: 1, p: 3, display: 'flex', alignItems: 'stretch' }}
                >
                  <Box sx={{ width: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-start' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          mr: 2,
                          flexShrink: 0,
                          display: 'grid',
                          borderRadius: 1.75,
                          color: 'primary.main',
                          placeItems: 'center',
                          bgcolor: 'primary.lighter',
                        }}
                      >
                        <Iconify icon="solar:notebook-bold-duotone" width={28} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ lineHeight: 1.35 }}>
                          {row.subject.name}
                        </Typography>
                        {!isTeacher && (
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ mt: 0.5, color: 'text.secondary' }}
                          >
                            {teacherName}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ gap: 1, mb: 3, display: 'flex', flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        icon={<Iconify icon="solar:users-group-rounded-bold" />}
                        label={`ห้อง ${row.classroom.name}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<Iconify icon="mingcute:calendar-month-line" />}
                        label={row.semester.name}
                      />
                    </Box>

                    <Box
                      sx={{
                        pt: 2,
                        mt: 'auto',
                        display: 'flex',
                        color: 'primary.main',
                        alignItems: 'center',
                        borderTop: '1px dashed',
                        borderColor: 'divider',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="subtitle2">จัดการงานและคะแนน</Typography>
                      <Iconify icon="eva:arrow-ios-forward-fill" width={22} />
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}

      {!isLoading && !isError && !filteredRows.length && (
        <Card variant="outlined" sx={{ py: 7, px: 3, textAlign: 'center' }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              mx: 'auto',
              mb: 2.5,
              display: 'grid',
              borderRadius: '50%',
              color: 'text.secondary',
              placeItems: 'center',
              bgcolor: 'background.neutral',
            }}
          >
            <Iconify icon={search ? 'eva:search-fill' : 'solar:notebook-bold-duotone'} width={36} />
          </Box>
          <Typography variant="h6">
            {search ? 'ไม่พบชั้นเรียนที่ค้นหา' : 'ยังไม่มีชั้นเรียนที่ได้รับมอบหมาย'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {search
              ? 'ลองเปลี่ยนคำค้นหา หรือล้างคำค้นหาเพื่อดูทั้งหมด'
              : 'เมื่อได้รับมอบหมาย รายวิชาจะแสดงที่นี่'}
          </Typography>
          {search && (
            <Button sx={{ mt: 2.5 }} onClick={() => setSearch('')}>
              ล้างคำค้นหา
            </Button>
          )}
        </Card>
      )}

      {!isTeacher && (
        <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
          <Form methods={methods} onSubmit={onSubmit}>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography component="h2" variant="h6">
                    เพิ่มครูประจำวิชา
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    มอบหมายครูให้กับรายวิชา ห้องเรียน และภาคเรียน
                  </Typography>
                </Box>
                <IconButton
                  onClick={closeDialog}
                  disabled={createMutation.isPending}
                  aria-label="ปิดหน้าต่าง"
                >
                  <Iconify icon="mingcute:close-line" />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {createMutation.error && (
                <Alert severity="error" sx={{ mb: 2.5 }}>
                  {createMutation.error.message}
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
                  name="teacherId"
                  label="ครูผู้สอน *"
                  disabled={teachersLoading}
                  helperText="ครูที่รับผิดชอบรายวิชานี้"
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {`${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() ||
                        teacher.username}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Select
                  name="subjectId"
                  label="รายวิชา *"
                  disabled={!semesterId || subjectsLoading}
                  helperText={
                    semesterId
                      ? 'แสดงเฉพาะวิชาที่เปิดในภาคเรียนนี้'
                      : 'เลือกปีการศึกษาและภาคเรียนก่อน'
                  }
                >
                  {availableSubjects.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.code ? `${subject.code} · ${subject.name}` : subject.name}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Select
                  name="classroomId"
                  label="ห้องเรียน *"
                  disabled={classroomsLoading}
                  helperText="ห้องเรียนที่รับผิดชอบ"
                >
                  {classrooms.map((classroom) => (
                    <MenuItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Select
                  name="academicYearId"
                  label="ปีการศึกษา *"
                  disabled={yearsLoading}
                  helperText="เลือกก่อนเพื่อโหลดภาคเรียน"
                >
                  {academicYears.map((year) => (
                    <MenuItem key={year.id} value={year.id}>
                      {year.year}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Field.Select
                  name="semesterId"
                  label="ภาคเรียน *"
                  disabled={!academicYearId || semestersLoading}
                  helperText={academicYearId ? 'ภาคเรียนที่ต้องการมอบหมาย' : 'เลือกปีการศึกษาก่อน'}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                >
                  {semesters.map((semester) => (
                    <MenuItem key={semester.id} value={semester.id}>
                      {semester.name}
                    </MenuItem>
                  ))}
                </Field.Select>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="inherit" onClick={closeDialog} disabled={createMutation.isPending}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="contained" loading={createMutation.isPending}>
                เพิ่มครูประจำวิชา
              </Button>
            </DialogActions>
          </Form>
        </Dialog>
      )}
    </Container>
  );
}
