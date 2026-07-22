'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';

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

import { createUser } from 'src/sections/user/user-actions';
import { listSchools } from 'src/sections/school/school-actions';

// ----------------------------------------------------------------------

export const SchoolAdminCreateSchema = z.object({
  firstName: z.string().min(1, { error: 'กรุณากรอกชื่อ!' }),
  lastName: z.string().min(1, { error: 'กรุณากรอกนามสกุล!' }),
  username: z.string().min(1, { error: 'กรุณากรอกชื่อผู้ใช้งาน!' }),
  email: z.union([z.literal(''), z.email({ error: 'อีเมลไม่ถูกต้อง!' })]),
  password: z.string().min(6, { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!' }),
  schoolId: z.string().min(1, { error: 'กรุณาเลือกโรงเรียน!' }),
});

// ----------------------------------------------------------------------

export function SchoolAdminCreateView() {
  const router = useRouter();

  const { data: schools } = useQuery({ queryKey: ['schools'], queryFn: listSchools });

  const methods = useForm({
    resolver: zodResolver(SchoolAdminCreateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      schoolId: '',
    },
  });

  const { handleSubmit } = methods;

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => router.push(paths.master.schoolAdmin.root),
  });

  const onSubmit = handleSubmit(async (data) =>
    createMutation.mutate({ ...data, email: data.email || undefined, role: 'school_admin' })
  );

  return (
    <Container sx={{ py: 10 }}>
      <Typography variant="h3" sx={{ mb: 5 }}>
        เพิ่มผู้ดูแลโรงเรียน
      </Typography>

      <Card sx={{ p: 3, maxWidth: 480 }}>
        {createMutation.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {createMutation.error.message}
          </Alert>
        )}

        <Form methods={methods} onSubmit={onSubmit}>
          <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
            <Field.Select name="schoolId" label="โรงเรียน">
              {schools?.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name}
                </MenuItem>
              ))}
            </Field.Select>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Field.Text name="firstName" label="ชื่อ" />
              <Field.Text name="lastName" label="นามสกุล" />
            </Box>

            <Field.Text name="username" label="ชื่อผู้ใช้งาน" />
            <Field.Text name="email" label="อีเมล (ไม่บังคับ)" />
            <Field.Text name="password" label="รหัสผ่าน" type="password" />

            <Button
              type="submit"
              variant="contained"
              size="large"
              loading={createMutation.isPending}
            >
              เพิ่มผู้ดูแลโรงเรียน
            </Button>
          </Box>
        </Form>
      </Card>
    </Container>
  );
}
