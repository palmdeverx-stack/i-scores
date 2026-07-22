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

import { useAuthContext } from 'src/auth/hooks';

import { createAssignment } from '../assignment-actions';

// ----------------------------------------------------------------------

export const AssignmentCreateSchema = z.object({
  title: z.string().min(1, { error: 'กรุณากรอกชื่องาน!' }),
  description: z.string(),
  fullScore: z
    .string()
    .min(1, { error: 'กรุณากรอกคะแนนเต็ม!' })
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      error: 'คะแนนเต็มต้องมากกว่า 0!',
    }),
});

// ----------------------------------------------------------------------

type Props = {
  teacherAssignmentId: string;
};

export function AssignmentCreateView({ teacherAssignmentId }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();
  const isTeacher = user?.role === 'teacher';

  const detailPath = isTeacher
    ? paths.teacher.assignmentDetail(teacherAssignmentId)
    : paths.admin.teacherAssignment.detail(teacherAssignmentId);

  const methods = useForm({
    resolver: zodResolver(AssignmentCreateSchema),
    defaultValues: { title: '', description: '', fullScore: '100' },
  });

  const { handleSubmit } = methods;

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; fullScore: string }) =>
      createAssignment(teacherAssignmentId, {
        title: data.title,
        description: data.description || undefined,
        fullScore: Number(data.fullScore),
      }),
    onSuccess: () => router.push(detailPath),
  });

  const onSubmit = handleSubmit(async (data) => createMutation.mutate(data));

  return (
    <Container sx={{ py: 10 }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        สร้างงาน
      </Typography>

      <Card sx={{ p: 3, maxWidth: 480 }}>
        {createMutation.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {createMutation.error.message}
          </Alert>
        )}

        <Form methods={methods} onSubmit={onSubmit}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <Field.Text name="title" label="ชื่องาน" />
            <Field.Text name="description" label="รายละเอียด (ไม่บังคับ)" multiline rows={3} />
            <Field.Text name="fullScore" label="คะแนนเต็ม" />

            <Button
              type="submit"
              variant="contained"
              size="large"
              loading={createMutation.isPending}
            >
              สร้างงาน
            </Button>
          </Box>
        </Form>
      </Card>
    </Container>
  );
}
