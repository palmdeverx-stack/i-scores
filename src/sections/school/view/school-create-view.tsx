'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { createSchool } from '../school-actions';

// ----------------------------------------------------------------------

export type SchoolCreateSchemaType = z.infer<typeof SchoolCreateSchema>;

export const SchoolCreateSchema = z.object({
  name: z.string().trim().min(1, { error: 'กรุณากรอกชื่อโรงเรียน!' }),
  code: z.string().trim().min(1, { error: 'กรุณากรอกรหัสโรงเรียน!' }),
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

  const onSubmit = handleSubmit((data) =>
    createSchoolMutation.mutate({ name: data.name.trim(), code: data.code.trim() })
  );

  return (
    <Container maxWidth="lg" sx={{ pb: { xs: 5, md: 7 } }}>
      <Button
        component={RouterLink}
        href={paths.master.school.root}
        color="inherit"
        startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
        sx={{ mb: 2 }}
      >
        กลับไปหน้ารายการ
      </Button>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          เพิ่มโรงเรียนใหม่
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          สร้างพื้นที่สำหรับโรงเรียนใหม่ในระบบ
        </Typography>
      </Box>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
        }}
      >
        <Card variant="outlined">
          <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  display: 'grid',
                  borderRadius: 1.5,
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: 'primary.lighter',
                }}
              >
                <Iconify icon="solar:home-angle-bold-duotone" width={24} />
              </Box>
              <Box>
                <Typography variant="h6">ข้อมูลโรงเรียน</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  กรอกข้อมูลพื้นฐานที่ใช้แสดงในระบบ
                </Typography>
              </Box>
            </Box>
          </Box>
          <Divider />
          <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
            {createSchoolMutation.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {createSchoolMutation.error.message}
              </Alert>
            )}
            <Form methods={methods} onSubmit={onSubmit}>
              <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
                <Field.Text
                  name="name"
                  label="ชื่อโรงเรียน"
                  placeholder="เช่น โรงเรียนตัวอย่างวิทยา"
                  helperText="ชื่อเต็มที่ต้องการให้แสดงบนหน้าระบบ"
                />
                <Field.Text
                  name="code"
                  label="รหัสโรงเรียน"
                  placeholder="เช่น SCH001"
                  helperText="ใช้สำหรับอ้างอิงโรงเรียน ควรเป็นรหัสสั้นและไม่ซ้ำกัน"
                />
                <Box sx={{ gap: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    component={RouterLink}
                    href={paths.master.school.root}
                    color="inherit"
                    disabled={createSchoolMutation.isPending}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    loading={createSchoolMutation.isPending}
                    startIcon={<Iconify icon="solar:file-text-bold" />}
                  >
                    บันทึกโรงเรียน
                  </Button>
                </Box>
              </Box>
            </Form>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6">ขั้นตอนถัดไป</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, mb: 2.5, color: 'text.secondary' }}>
            หลังสร้างโรงเรียนแล้ว สามารถตั้งค่าต่อได้ดังนี้
          </Typography>
          {[
            { label: 'สร้างบัญชีผู้ดูแลโรงเรียน', icon: 'solar:user-plus-bold' as const },
            { label: 'ผู้ดูแลเพิ่มข้อมูลโรงเรียน', icon: 'solar:notebook-bold-duotone' as const },
            {
              label: 'เริ่มเพิ่มครูและนักเรียน',
              icon: 'solar:users-group-rounded-bold-duotone' as const,
            },
          ].map((item, index) => (
            <Box key={item.label} sx={{ gap: 1.25, mb: 2, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  display: 'grid',
                  borderRadius: '50%',
                  placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: 'primary.lighter',
                }}
              >
                <Iconify icon={item.icon} width={17} />
              </Box>
              <Box>
                <Typography variant="subtitle2">{item.label}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  ขั้นตอนที่ {index + 1}
                </Typography>
              </Box>
            </Box>
          ))}
          <Alert severity="info" sx={{ mt: 2 }}>
            สถานะเริ่มต้นของโรงเรียนจะเป็น “เปิดใช้งาน”
          </Alert>
        </Card>
      </Box>
    </Container>
  );
}
