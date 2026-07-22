'use client';

import * as z from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Form, Field } from 'src/components/hook-form';

import { listSemesters, listAcademicYears } from 'src/sections/academic-year/academic-year-actions';

import { createSubject } from '../subject-actions';

// ----------------------------------------------------------------------

export const SubjectCreateSchema = z.object({
  code: z.string(),
  name: z.string().min(1, { error: 'กรุณากรอกชื่อวิชา!' }),
  credits: z.number().min(0, { error: 'หน่วยกิตต้องไม่ต่ำกว่า 0!' }).max(99),
  description: z.string().max(2000, { error: 'คำอธิบายต้องไม่เกิน 2,000 ตัวอักษร!' }),
  academicYearId: z.string().min(1, { error: 'กรุณาเลือกปีการศึกษา!' }),
  semesterId: z.string().min(1, { error: 'กรุณาเลือกภาคเรียน!' }),
});

// ----------------------------------------------------------------------

export function SubjectCreateView() {
  const router = useRouter();

  const methods = useForm({
    resolver: zodResolver(SubjectCreateSchema),
    defaultValues: {
      code: '',
      name: '',
      credits: 1,
      description: '',
      academicYearId: '',
      semesterId: '',
    },
  });

  const { handleSubmit, control, setValue } = methods;
  const academicYearId = useWatch({ control, name: 'academicYearId' });
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: listAcademicYears,
  });
  const { data: semesters = [] } = useQuery({
    queryKey: ['semesters', academicYearId],
    queryFn: () => listSemesters(academicYearId),
    enabled: !!academicYearId,
  });

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => router.push(paths.admin.subject.root),
  });

  const onSubmit = handleSubmit(async (data) =>
    createMutation.mutate({
      ...data,
      code: data.code || undefined,
      description: data.description || undefined,
    })
  );

  return (
    <Container sx={{ py: 10 }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        เพิ่มรายวิชา
      </Typography>

      <Card sx={{ p: 3, maxWidth: 480 }}>
        {createMutation.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {createMutation.error.message}
          </Alert>
        )}

        <Form methods={methods} onSubmit={onSubmit}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <Field.Select
              name="academicYearId"
              label="ปีการศึกษา"
              onChange={(event) => {
                setValue('academicYearId', event.target.value);
                setValue('semesterId', '');
              }}
            >
              {academicYears.map((year) => (
                <MenuItem key={year.id} value={year.id}>
                  {year.year}
                </MenuItem>
              ))}
            </Field.Select>
            <Field.Select name="semesterId" label="ภาคเรียน" disabled={!academicYearId}>
              {semesters.map((semester) => (
                <MenuItem key={semester.id} value={semester.id}>
                  {semester.name}
                </MenuItem>
              ))}
            </Field.Select>
            <Field.Text name="code" label="รหัสวิชา (ไม่บังคับ)" />
            <Field.Text name="name" label="ชื่อวิชา" />
            <Field.Text
              name="credits"
              label="หน่วยกิต"
              type="number"
              slotProps={{ htmlInput: { min: 0, max: 99, step: 0.5 } }}
            />
            <Field.Text name="description" label="คำอธิบาย" multiline minRows={3} />

            <Button
              type="submit"
              variant="contained"
              size="large"
              loading={createMutation.isPending}
            >
              เพิ่มรายวิชา
            </Button>
          </Box>
        </Form>
      </Card>
    </Container>
  );
}
