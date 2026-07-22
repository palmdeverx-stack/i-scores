'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Form, Field } from 'src/components/hook-form';

import { createSchool } from '../school-actions';

// ----------------------------------------------------------------------

export type SchoolCreateSchemaType = z.infer<typeof SchoolCreateSchema>;

export const SchoolCreateSchema = z.object({
  name: z.string().min(1, { error: 'กรุณากรอกชื่อโรงเรียน!' }),
  code: z.string().min(1, { error: 'กรุณากรอกรหัสโรงเรียน!' }),
});

// ----------------------------------------------------------------------

export function SchoolCreateView() {
  const router = useRouter();

  const methods = useForm({
    resolver: zodResolver(SchoolCreateSchema),
    defaultValues: { name: '', code: '' },
  });

  const { handleSubmit } = methods;

  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => router.push(paths.master.school.root),
  });

  const onSubmit = handleSubmit(async (data) => createSchoolMutation.mutate(data));

  return (
    <Container sx={{ py: 10 }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        เพิ่มโรงเรียนใหม่
      </Typography>

      <Card sx={{ p: 3, maxWidth: 480 }}>
        {createSchoolMutation.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {createSchoolMutation.error.message}
          </Alert>
        )}

        <Form methods={methods} onSubmit={onSubmit}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <Field.Text name="name" label="ชื่อโรงเรียน" />
            <Field.Text name="code" label="รหัสโรงเรียน" />

            <Button
              type="submit"
              variant="contained"
              size="large"
              loading={createSchoolMutation.isPending}
            >
              เพิ่มโรงเรียน
            </Button>
          </Box>
        </Form>
      </Card>
    </Container>
  );
}
