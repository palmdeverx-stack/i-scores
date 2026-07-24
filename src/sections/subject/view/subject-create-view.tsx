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
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { today, fIsBetween } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import { useAuthContext } from 'src/auth/hooks';

import { createSubject } from '../subject-actions';

// ----------------------------------------------------------------------

export const SubjectCreateSchema = z.object({
  code: z.string(),
  name: z.string().min(1, { error: 'กรุณากรอกชื่อวิชาภาษาไทย!' }),
  nameEn: z.string(),
  credits: z.number().min(0, { error: 'หน่วยกิตต้องไม่ต่ำกว่า 0!' }).max(99),
  description: z.string().max(2000, { error: 'คำอธิบายต้องไม่เกิน 2,000 ตัวอักษร!' }),
  descriptionEn: z.string().max(2000, { error: 'คำอธิบายภาษาอังกฤษต้องไม่เกิน 2,000 ตัวอักษร!' }),
  academicYearId: z.string().min(1, { error: 'กรุณาเลือกปีการศึกษา!' }),
  semesterId: z.string().min(1, { error: 'กรุณาเลือกภาคเรียน!' }),
});

// ----------------------------------------------------------------------

export function SubjectCreateView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isTeacher = user?.role === 'teacher';
  const backPath = isTeacher ? paths.teacher.assignments : paths.admin.subject.root;

  const methods = useForm({
    resolver: zodResolver(SubjectCreateSchema),
    defaultValues: {
      code: '',
      name: '',
      nameEn: '',
      credits: 1,
      description: '',
      descriptionEn: '',
      academicYearId: '',
      semesterId: '',
    },
  });

  const { handleSubmit, control, setValue } = methods;
  const academicYearId = useWatch({ control, name: 'academicYearId' });
  const {
    data: academicYears = [],
    isLoading: yearsLoading,
    isError: yearsError,
  } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  });
  const {
    data: semesters = [],
    isLoading: semestersLoading,
    isError: semestersError,
  } = useQuery({
    queryKey: ['semesters', academicYearId],
    queryFn: () => listSemesters(academicYearId),
    enabled: !!academicYearId,
  });
  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => router.push(backPath),
  });

  const onSubmit = handleSubmit(async (data) =>
    createMutation.mutate({
      ...data,
      code: data.code || undefined,
      description: data.description || undefined,
    })
  );

  const referenceDataError = yearsError || semestersError;

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
          <Button
            component={RouterLink}
            href={backPath}
            color="inherit"
            size="small"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            sx={{ mb: 1.5, color: 'text.secondary' }}
          >
            กลับไป{isTeacher ? 'หน้าวิชาที่สอน' : 'หน้ารายวิชา'}
          </Button>
          <Typography component="h1" variant="h3" sx={{ mb: 1 }}>
            สร้างรายวิชาใหม่
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            กรอกข้อมูลรายวิชาและภาคเรียน เพื่อนำไปใช้กับห้องเรียนและกำหนดครูผู้สอน
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
          <Iconify icon="solar:notebook-bold-duotone" width={36} />
        </Box>
      </Box>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' },
        }}
      >
        <Card variant="outlined" sx={{ overflow: 'visible' }}>
          <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
            {createMutation.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {createMutation.error.message}
              </Alert>
            )}
            {referenceDataError && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                โหลดตัวเลือกบางรายการไม่สำเร็จ กรุณารีเฟรชหน้าแล้วลองใหม่อีกครั้ง
              </Alert>
            )}

            <Form methods={methods} onSubmit={onSubmit}>
              <Box sx={{ gap: 4, display: 'flex', flexDirection: 'column' }}>
                <Box component="section" aria-labelledby="subject-term-title">
                  <SectionTitle
                    id="subject-term-title"
                    number="1"
                    title="ปีการศึกษาและภาคเรียน"
                    description="เลือกรอบการศึกษาที่ต้องการเปิดรายวิชานี้"
                  />
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
                      disabled={yearsLoading}
                      helperText="เลือกปีการศึกษาของรายวิชา"
                      onChange={(event) => {
                        setValue('academicYearId', event.target.value);
                        setValue('semesterId', '');
                      }}
                    >
                      {yearsLoading && <MenuItem disabled>กำลังโหลด...</MenuItem>}
                      {!yearsLoading && !academicYears.length && (
                        <MenuItem disabled>ยังไม่มีปีการศึกษา</MenuItem>
                      )}
                      {academicYears.map((year) => (
                        <MenuItem key={year.id} value={year.id}>
                          {year.year}{' '}
                          {fIsBetween(today(), year.start_date, year.end_date) ? '(ปัจจุบัน)' : ''}
                        </MenuItem>
                      ))}
                    </Field.Select>

                    <Field.Select
                      name="semesterId"
                      label="ภาคเรียน *"
                      disabled={!academicYearId || semestersLoading}
                      helperText={
                        academicYearId ? 'ภาคเรียนภายในปีการศึกษาที่เลือก' : 'เลือกปีการศึกษาก่อน'
                      }
                    >
                      {semestersLoading && <MenuItem disabled>กำลังโหลด...</MenuItem>}
                      {!semestersLoading && academicYearId && !semesters.length && (
                        <MenuItem disabled>ยังไม่มีภาคเรียน</MenuItem>
                      )}
                      {semesters.map((semester) => (
                        <MenuItem key={semester.id} value={semester.id}>
                          {semester.name}{' '}
                          {fIsBetween(today(), semester.start_date, semester.end_date)
                            ? '(ปัจจุบัน)'
                            : ''}
                        </MenuItem>
                      ))}
                    </Field.Select>
                  </Box>
                </Box>

                <Divider />

                <Box component="section" aria-labelledby="subject-information-title">
                  <SectionTitle
                    id="subject-information-title"
                    number="2"
                    title="ข้อมูลรายวิชา"
                    description="ระบุชื่อ รหัส หน่วยกิต และรายละเอียดของรายวิชา"
                  />
                  <Box
                    sx={{
                      gap: 2.5,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    }}
                  >
                    <Field.Text
                      name="code"
                      label="รหัสวิชา"
                      placeholder="เช่น MATH101"
                      helperText="ไม่บังคับ"
                      slotProps={{ htmlInput: { maxLength: 50 } }}
                    />
                    <Field.Text
                      name="name"
                      label="ชื่อวิชาภาษาไทย *"
                      placeholder="เช่น คณิตศาสตร์พื้นฐาน"
                      helperText="ชื่อหลักที่ครูและนักเรียนเห็นในระบบ"
                      slotProps={{ htmlInput: { maxLength: 200 } }}
                    />
                    <Field.Text
                      name="nameEn"
                      label="ชื่อวิชาภาษาอังกฤษ"
                      placeholder="e.g. Fundamental Mathematics"
                      helperText="ไม่บังคับ"
                      slotProps={{ htmlInput: { maxLength: 200, lang: 'en' } }}
                    />
                    <Field.Text
                      name="credits"
                      label="หน่วยกิต"
                      type="number"
                      helperText="กำหนดได้ตั้งแต่ 0 ถึง 99"
                      slotProps={{ htmlInput: { min: 0, max: 99, step: 0.5 } }}
                    />
                    <Field.Text
                      name="description"
                      label="คำอธิบายรายวิชา"
                      placeholder="ขอบเขตเนื้อหา จุดประสงค์ หรือรายละเอียดเพิ่มเติม"
                      helperText="ไม่บังคับ"
                      multiline
                      minRows={3}
                      slotProps={{ htmlInput: { maxLength: 2000 } }}
                      sx={{ gridColumn: { sm: '1 / -1' } }}
                    />
                    <Field.Text
                      name="descriptionEn"
                      label="คำอธิบายรายวิชาภาษาอังกฤษ"
                      placeholder="Course scope, objectives, or additional details"
                      helperText="ไม่บังคับ"
                      multiline
                      minRows={3}
                      slotProps={{ htmlInput: { maxLength: 2000, lang: 'en' } }}
                      sx={{ gridColumn: { sm: '1 / -1' } }}
                    />
                  </Box>
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
                    loading={createMutation.isPending}
                    loadingIndicator="กำลังสร้าง..."
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    sx={{ minWidth: 180, width: { xs: 1, sm: 'auto' } }}
                  >
                    สร้างรายวิชา
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
          <Box
            sx={{
              width: 44,
              height: 44,
              mb: 2,
              display: 'grid',
              borderRadius: 1.5,
              color: 'primary.main',
              placeItems: 'center',
              bgcolor: 'primary.lighter',
            }}
          >
            <Iconify icon="solar:info-circle-bold" width={26} />
          </Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            หลังสร้างวิชาแล้วทำอะไรต่อ?
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
            รายวิชาจะพร้อมให้นำไปใช้งานกับห้องเรียนภายในภาคเรียนที่เลือก
          </Typography>

          {[
            'สร้างหรือเลือกห้องเรียน',
            'กำหนดครูผู้สอนให้รายวิชา',
            'เพิ่มนักเรียนและเริ่มสร้างงาน',
          ].map((text, index) => (
            <Box key={text} sx={{ gap: 1.5, mb: 1.75, display: 'flex', alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  mt: 0.1,
                  flexShrink: 0,
                  display: 'grid',
                  borderRadius: '50%',
                  color: 'common.white',
                  placeItems: 'center',
                  typography: 'caption',
                  bgcolor: 'primary.main',
                }}
              >
                {index + 1}
              </Box>
              <Typography variant="body2">{text}</Typography>
            </Box>
          ))}
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
