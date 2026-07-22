'use client';

import * as z from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { listUsers } from 'src/sections/user/user-actions';
import { listClassrooms } from 'src/sections/classroom/classroom-actions';

import { useAuthContext } from 'src/auth/hooks';

import { listEnrollments, createEnrollment } from '../enrollment-actions';

// ----------------------------------------------------------------------

export const EnrollmentCreateSchema = z.object({
  studentId: z.string().min(1, { error: 'กรุณาเลือกนักเรียน!' }),
  classroomId: z.string().min(1, { error: 'กรุณาเลือกห้องเรียน!' }),
  studentNumber: z
    .string()
    .trim()
    .refine((value) => !value || /^\d+$/.test(value), { error: 'เลขที่ต้องเป็นตัวเลขเท่านั้น!' }),
});

type EnrollmentCreateSchemaType = z.infer<typeof EnrollmentCreateSchema>;

// ----------------------------------------------------------------------

export function EnrollmentCreateView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isTeacher = user?.role === 'teacher';
  const backPath = isTeacher ? paths.teacher.assignments : paths.admin.enrollment.root;

  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ['users', 'student'],
    queryFn: () => listUsers('student'),
  });
  const {
    data: classrooms = [],
    isLoading: classroomsLoading,
    isError: classroomsError,
  } = useQuery({ queryKey: ['classrooms'], queryFn: listClassrooms });

  const methods = useForm<EnrollmentCreateSchemaType>({
    resolver: zodResolver(EnrollmentCreateSchema),
    defaultValues: { studentId: '', classroomId: '', studentNumber: '' },
  });

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = methods;
  const studentId = useWatch({ control, name: 'studentId' });
  const classroomId = useWatch({ control, name: 'classroomId' });
  const studentNumber = useWatch({ control, name: 'studentNumber' });

  const selectedStudent = students.find((student) => student.id === studentId) ?? null;
  const selectedClassroom = classrooms.find((classroom) => classroom.id === classroomId) ?? null;

  const { data: studentEnrollments = [] } = useQuery({
    queryKey: ['enrollments', 'student', studentId],
    queryFn: () => listEnrollments({ studentId }),
    enabled: !!studentId,
  });

  // A student can only belong to one classroom per academic year — surface the
  // conflict here instead of only after a failed submit.
  const conflictingEnrollment = selectedClassroom
    ? studentEnrollments.find(
        (enrollment) => enrollment.classroom.academic_year_id === selectedClassroom.academic_year_id
      )
    : null;
  const isSameClassroom = conflictingEnrollment?.classroom.id === selectedClassroom?.id;

  const createMutation = useMutation({
    mutationFn: createEnrollment,
    onSuccess: () => router.push(backPath),
  });

  const onSubmit = handleSubmit(async (data) =>
    createMutation.mutate({
      ...data,
      studentNumber: data.studentNumber.trim() || undefined,
    })
  );

  const studentName = selectedStudent
    ? `${selectedStudent.first_name ?? ''} ${selectedStudent.last_name ?? ''}`.trim() ||
      selectedStudent.username
    : '';

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
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
          <Button
            component={RouterLink}
            href={backPath}
            color="inherit"
            size="small"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{ mb: 1.5, color: 'text.secondary' }}
          >
            กลับไปหน้าชั้นเรียน
          </Button>
          <Typography component="h1" variant="h3" sx={{ mb: 1 }}>
            เพิ่มนักเรียนเข้าห้อง
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            ค้นหานักเรียน เลือกห้องเรียน และระบุเลขที่ให้เรียบร้อยก่อนยืนยัน
          </Typography>
        </Box>

        <Box
          sx={{
            width: 64,
            height: 64,
            flexShrink: 0,
            display: { xs: 'none', sm: 'grid' },
            borderRadius: 2.5,
            color: 'primary.main',
            placeItems: 'center',
            bgcolor: 'primary.lighter',
          }}
        >
          <Iconify icon="solar:user-plus-bold" width={34} />
        </Box>
      </Box>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
        }}
      >
        <Card variant="outlined" sx={{ overflow: 'visible' }}>
          <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
            {createMutation.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {createMutation.error.message}
              </Alert>
            )}

            {(studentsError || classroomsError) && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                โหลดรายชื่อนักเรียนหรือห้องเรียนไม่สำเร็จ กรุณารีเฟรชหน้าแล้วลองใหม่
              </Alert>
            )}

            <Form methods={methods} onSubmit={onSubmit}>
              <Box sx={{ gap: 4, display: 'flex', flexDirection: 'column' }}>
                <Box component="section" aria-labelledby="student-selection-title">
                  <SectionTitle
                    id="student-selection-title"
                    number="1"
                    title="เลือกนักเรียน"
                    description="พิมพ์ชื่อหรือชื่อผู้ใช้งานเพื่อค้นหานักเรียน"
                  />

                  <Autocomplete
                    fullWidth
                    options={students}
                    value={selectedStudent}
                    loading={studentsLoading}
                    disabled={studentsLoading || studentsError}
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
                    loadingText="กำลังโหลดรายชื่อนักเรียน..."
                    renderOption={(props, option) => {
                      const name =
                        `${option.first_name ?? ''} ${option.last_name ?? ''}`.trim() ||
                        option.username;

                      return (
                        <Box component="li" {...props} key={option.id}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              @{option.username}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="นักเรียน *"
                        placeholder="ค้นหาชื่อนักเรียน"
                        error={!!errors.studentId}
                        helperText={errors.studentId?.message ?? 'เลือกนักเรียนที่ต้องการเพิ่มเข้าห้อง'}
                      />
                    )}
                  />
                </Box>

                <Divider />

                <Box component="section" aria-labelledby="classroom-selection-title">
                  <SectionTitle
                    id="classroom-selection-title"
                    number="2"
                    title="เลือกห้องเรียน"
                    description="เลือกห้องปลายทางและกำหนดเลขที่ของนักเรียน"
                  />

                  <Box
                    sx={{
                      gap: 2.5,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 180px' },
                    }}
                  >
                    <Autocomplete
                      fullWidth
                      options={classrooms}
                      value={selectedClassroom}
                      loading={classroomsLoading}
                      disabled={classroomsLoading || classroomsError}
                      getOptionLabel={(option) =>
                        option.academic_years?.year
                          ? `${option.name} · ปีการศึกษา ${option.academic_years.year}`
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
                      loadingText="กำลังโหลดห้องเรียน..."
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="ห้องเรียน *"
                          placeholder="ค้นหาห้องเรียน"
                          error={!!errors.classroomId}
                          helperText={errors.classroomId?.message ?? 'ห้องที่ต้องการเพิ่มนักเรียนเข้าไป'}
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
                  </Box>

                  {conflictingEnrollment && (
                    <Alert severity="warning" sx={{ mt: 2.5 }}>
                      {isSameClassroom
                        ? 'นักเรียนคนนี้อยู่ในห้องนี้อยู่แล้ว'
                        : `นักเรียนคนนี้อยู่ห้อง "${conflictingEnrollment.classroom.name}" แล้วในปีการศึกษา ${conflictingEnrollment.classroom.academic_years?.year ?? '-'} — นักเรียน 1 คนอยู่ได้เพียง 1 ห้องเรียนต่อปีการศึกษา จึงไม่สามารถเพิ่มเข้าห้องนี้ได้`}
                    </Alert>
                  )}
                </Box>

                <Divider />

                <Box
                  sx={{
                    gap: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: { xs: 'column-reverse', sm: 'row' },
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    component={RouterLink}
                    href={backPath}
                    color="inherit"
                    size="large"
                    sx={{ width: { xs: 1, sm: 'auto' } }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    size="large"
                    variant="contained"
                    disabled={!!conflictingEnrollment}
                    loading={createMutation.isPending}
                    loadingIndicator="กำลังเพิ่ม..."
                    startIcon={<Iconify icon="solar:user-plus-bold" />}
                    sx={{ minWidth: 210, width: { xs: 1, sm: 'auto' } }}
                  >
                    เพิ่มนักเรียนเข้าห้อง
                  </Button>
                </Box>
              </Box>
            </Form>
          </Box>
        </Card>

        <Card
          variant="outlined"
          sx={{
            p: 3,
            top: 96,
            position: { md: 'sticky' },
            bgcolor: 'background.neutral',
          }}
        >
          <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.main' }}>
                ตรวจสอบก่อนยืนยัน
              </Typography>
              <Typography variant="h6">สรุปการเพิ่มนักเรียน</Typography>
            </Box>
            <Iconify icon="solar:file-check-bold-duotone" width={32} />
          </Box>

          <SummaryRow
            icon="solar:user-rounded-bold"
            label="นักเรียน"
            value={studentName || 'ยังไม่ได้เลือก'}
            ready={!!selectedStudent}
          />
          <SummaryRow
            icon="solar:users-group-rounded-bold"
            label="ห้องเรียน"
            value={selectedClassroom?.name ?? 'ยังไม่ได้เลือก'}
            ready={!!selectedClassroom}
          />
          <SummaryRow
            icon="solar:list-bold"
            label="เลขที่"
            value={studentNumber || 'ไม่ระบุ'}
            ready={!!studentNumber}
          />

          <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />} sx={{ mt: 2.5 }}>
            นักเรียน 1 คนอยู่ได้เพียง 1 ห้องเรียนต่อปีการศึกษา แต่เรียนได้หลายวิชาในห้องนั้น
          </Alert>
        </Card>
      </Box>
    </Container>
  );
}

// ----------------------------------------------------------------------

type SectionTitleProps = {
  id: string;
  number: string;
  title: string;
  description: string;
};

function SectionTitle({ id, number, title, description }: SectionTitleProps) {
  return (
    <Box sx={{ gap: 1.5, mb: 3, display: 'flex', alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          display: 'grid',
          borderRadius: '50%',
          color: 'common.white',
          placeItems: 'center',
          typography: 'subtitle2',
          bgcolor: 'primary.main',
        }}
      >
        {number}
      </Box>
      <Box>
        <Typography id={id} component="h2" variant="h6">
          {title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.25, color: 'text.secondary' }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

type SummaryRowProps = {
  icon: 'solar:user-rounded-bold' | 'solar:users-group-rounded-bold' | 'solar:list-bold';
  label: string;
  value: string;
  ready: boolean;
};

function SummaryRow({ icon, label, value, ready }: SummaryRowProps) {
  return (
    <Box sx={{ gap: 1.5, py: 1.5, display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          display: 'grid',
          borderRadius: 1.25,
          color: ready ? 'primary.main' : 'text.disabled',
          placeItems: 'center',
          bgcolor: ready ? 'primary.lighter' : 'action.hover',
        }}
      >
        <Iconify icon={icon} width={21} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: ready ? 'text.primary' : 'text.disabled' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
