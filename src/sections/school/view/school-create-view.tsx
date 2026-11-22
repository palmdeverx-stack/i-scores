'use client';

import type { CreateSchoolResult } from '../school-actions';

import * as z from 'zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { toast } from 'src/components/snackbar';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import { getSchool, createSchool, updateSchool, resendSchoolInvite } from '../school-actions';
import {
  SCHOOL_ADMIN_USERNAME_ERROR,
  SCHOOL_ADMIN_USERNAME_PATTERN,
} from '../school-admin-username';

// ----------------------------------------------------------------------

export type SchoolCreateSchemaType = z.infer<typeof SchoolCreateSchema>;

export const SchoolCreateSchema = z.object({
  name: z.string().trim().min(1, { error: 'กรุณากรอกชื่อโรงเรียนภาษาไทย!' }),
  nameEn: z.string().trim(),
  code: z
    .string()
    .trim()
    .regex(/^\d{8}$/, { error: 'รหัสโรงเรียนต้องเป็นตัวเลข 8 หลัก' }),
  email: z.email({ error: 'กรุณากรอกอีเมลโรงเรียนให้ถูกต้อง' }),
  adminUsername: z
    .string()
    .trim()
    .refine((value) => !value || SCHOOL_ADMIN_USERNAME_PATTERN.test(value), {
      error: SCHOOL_ADMIN_USERNAME_ERROR,
    }),
});

// ----------------------------------------------------------------------

type EmailPreview = { subject: string; html: string };

type SchoolFormProps = {
  emailPreview: EmailPreview;
  school?: Awaited<ReturnType<typeof getSchool>>;
};

export function SchoolEditView({
  schoolId,
  emailPreview,
}: {
  schoolId: string;
  emailPreview: EmailPreview;
}) {
  const validId = z.uuid().safeParse(schoolId).success;
  const schoolQuery = useQuery({
    queryKey: ['master-school-edit', schoolId],
    queryFn: () => getSchool(schoolId, true),
    enabled: validId,
  });

  if (schoolQuery.data)
    return (
      <SchoolCreateView key={schoolId} school={schoolQuery.data} emailPreview={emailPreview} />
    );

  return (
    <Container maxWidth="xl" sx={{ pb: 5 }}>
      <Button component={RouterLink} href={paths.master.school.root} color="inherit" sx={{ mb: 2 }}>
        กลับไปหน้ารายการ
      </Button>
      <Typography component="h1" variant="h3" sx={{ mb: 3 }}>
        แก้ไขโรงเรียน
      </Typography>
      {validId && schoolQuery.isPending ? (
        <CircularProgress size={28} aria-label="กำลังโหลดข้อมูลโรงเรียน" />
      ) : (
        <Alert
          severity="error"
          action={
            validId && (
              <Button color="inherit" onClick={() => schoolQuery.refetch()}>
                ลองอีกครั้ง
              </Button>
            )
          }
        >
          {schoolQuery.error?.message ?? 'ไม่พบโรงเรียนนี้'}
        </Alert>
      )}
    </Container>
  );
}

export function SchoolCreateView({ emailPreview, school }: SchoolFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<CreateSchoolResult | null>(null);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const methods = useForm({
    resolver: zodResolver(
      school
        ? SchoolCreateSchema.extend({
            email: z
              .string()
              .trim()
              .refine(
                (value) => value === (school.email ?? '') || z.email().safeParse(value).success,
                { error: 'กรุณากรอกอีเมลรับคำเชิญให้ถูกต้อง' }
              ),
            adminUsername: z
              .string()
              .trim()
              .refine(
                (value) =>
                  value === (school.adminUsername ?? '') ||
                  SCHOOL_ADMIN_USERNAME_PATTERN.test(value),
                { error: SCHOOL_ADMIN_USERNAME_ERROR }
              ),
          })
        : SchoolCreateSchema
    ),
    defaultValues: {
      name: school?.name ?? '',
      nameEn: school?.name_en ?? '',
      code: school?.code ?? '',
      email: school?.email ?? '',
      adminUsername: school?.adminUsername ?? '',
    },
  });
  const { control, handleSubmit } = methods;
  const schoolCode = useWatch({ control, name: 'code' }).trim();
  const inviteEmail = useWatch({ control, name: 'email' }).trim();
  const inviteUsername = useWatch({ control, name: 'adminUsername' }).trim();
  const unsavedInviteDetails = Boolean(
    school &&
    (inviteEmail !== (school.email ?? '') || inviteUsername !== (school.adminUsername ?? ''))
  );

  const canSetTemporaryPassword = Boolean(
    school?.administratorNeedsPasswordChange && school?.administratorEmail
  );
  const resendRecipient = temporaryPassword ? school?.administratorEmail : school?.email;
  const resendMutation = useMutation({
    mutationFn: (id: string) =>
      resendSchoolInvite(
        id,
        temporaryPassword ? (school?.administratorId ?? undefined) : undefined,
        temporaryPassword || undefined
      ),
    onSuccess: () => {
      setResendOpen(false);
      setTemporaryPassword('');
      toast.success('ผู้ให้บริการรับคำขอส่งอีเมลเชิญแล้ว');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SchoolCreateSchemaType) => {
      const fields = { name: data.name, nameEn: data.nameEn, code: data.code };
      if (school) {
        await updateSchool(school.id, {
          ...fields,
          ...(data.email !== (school.email ?? '') && { email: data.email }),
          ...(school.administratorId &&
            data.adminUsername !== school.adminUsername && {
              adminUsername: data.adminUsername,
              administratorId: school.administratorId,
            }),
        });
        return null;
      }
      return createSchool({
        ...fields,
        email: data.email,
        adminUsername: data.adminUsername || undefined,
      });
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['schools'] });
      if (data) {
        setResult(data);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['master-school-edit', school?.id] });
        toast.success('บันทึกการแก้ไขแล้ว');
        router.push(paths.master.school.root);
      }
    },
  });

  const onSubmit = handleSubmit((data) => saveMutation.mutate(data));

  const closeResultDialog = () => {
    setResult(null);
    router.push(paths.master.school.root);
  };

  const copyPassword = async () => {
    if (!result?.adminPassword) return;
    await navigator.clipboard.writeText(result.adminPassword);
    toast.success('คัดลอกรหัสผ่านแล้ว');
  };

  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
      <Button
        component={RouterLink}
        href={paths.master.school.root}
        color="inherit"
        startIcon={<RemixIcon icon="eva:arrow-ios-back-fill" />}
        sx={{ mb: 2 }}
      >
        กลับไปหน้ารายการ
      </Button>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h3">
          {school ? 'แก้ไขโรงเรียน' : 'เพิ่มโรงเรียนใหม่'}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          {school ? 'แก้ไขชื่อและรหัสอ้างอิงของโรงเรียน' : 'สร้างพื้นที่สำหรับโรงเรียนใหม่ในระบบ'}
        </Typography>
      </Box>
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            xl: 'minmax(0, 1fr) 320px',
          },
        }}
      >
        <Card variant="outlined">
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {saveMutation.error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {saveMutation.error.message}
              </Alert>
            )}
            <Form methods={methods} onSubmit={onSubmit}>
              <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
                ข้อมูลโรงเรียน
              </Typography>
              <Box
                sx={{
                  gap: { xs: 2, sm: 2.5 },
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <Field.Text
                  name="name"
                  label="ชื่อโรงเรียนภาษาไทย"
                  placeholder="เช่น โรงเรียนตัวอย่างวิทยา"
                  required
                />
                <Field.Text
                  name="nameEn"
                  label="ชื่อโรงเรียนภาษาอังกฤษ"
                  placeholder="Example Wittaya School"
                  slotProps={{ htmlInput: { lang: 'en' } }}
                />
                <Field.Text
                  name="code"
                  label="รหัสโรงเรียน"
                  placeholder="12345678"
                  helperText="ตัวเลข 8 หลัก ใช้เป็น PIN ของผู้ดูแล"
                  required
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
                />
              </Box>
              <Divider sx={{ my: 3 }} />
              <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
                บัญชีผู้ดูแลโรงเรียน
              </Typography>
              <Box
                sx={{
                  gap: { xs: 2, sm: 2.5 },
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    md: 'repeat(2, minmax(0, 1fr))',
                  },
                }}
              >
                <Field.Text
                  name="adminUsername"
                  label="ชื่อผู้ใช้งาน"
                  placeholder="admin.banlao"
                  helperText={
                    school
                      ? school.adminUsername
                        ? 'ใช้ชื่อใหม่นี้ในการเข้าสู่ระบบครั้งถัดไป'
                        : 'โรงเรียนนี้ยังไม่มีบัญชีผู้ดูแล'
                      : /^\d{8}$/.test(schoolCode)
                        ? `เว้นว่างเพื่อใช้ admin.${schoolCode}`
                        : 'เว้นว่างเพื่อสร้างชื่อจากรหัสโรงเรียน'
                  }
                  slotProps={{
                    htmlInput: { maxLength: 64, autoCapitalize: 'none', spellCheck: false },
                  }}
                  disabled={Boolean(school && !school.administratorId)}
                />
                <Field.Text
                  name="email"
                  label="อีเมลรับคำเชิญ"
                  type="email"
                  placeholder="school@example.ac.th"
                  helperText={
                    school
                      ? 'ใช้สำหรับรับคำเชิญครั้งถัดไป'
                      : 'ระบบจะส่งข้อมูลเข้าสู่ระบบมาที่อีเมลนี้'
                  }
                  required={!school}
                />
              </Box>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {emailPreview && (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setEmailPreviewOpen(true)}
                    startIcon={<RemixIcon icon="solar:letter-bold-duotone" />}
                    sx={{ mr: 'auto' }}
                  >
                    พรีวิวอีเมล
                  </Button>
                )}
                {school?.workspace_type === 'school' && school.administratorId && (
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={
                      (!school.email && !canSetTemporaryPassword) ||
                      !school.is_active ||
                      unsavedInviteDetails ||
                      saveMutation.isPending
                    }
                    onClick={() => {
                      resendMutation.reset();
                      setTemporaryPassword('');
                      setResendOpen(true);
                    }}
                  >
                    ส่งอีเมลเชิญอีกครั้ง
                  </Button>
                )}
                <Button
                  component={RouterLink}
                  href={paths.master.school.root}
                  color="inherit"
                  disabled={saveMutation.isPending}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  loading={saveMutation.isPending}
                  startIcon={<RemixIcon icon="solar:file-text-bold" />}
                >
                  {school ? 'บันทึกการแก้ไข' : 'บันทึกโรงเรียน'}
                </Button>
              </Box>
            </Form>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6">เกิดอะไรขึ้นต่อจากนี้</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, mb: 2.5, color: 'text.secondary' }}>
            {school ? 'เมื่อบันทึกการแก้ไข' : 'ทำอัตโนมัติทันทีที่บันทึกโรงเรียนสำเร็จ'}
          </Typography>
          {(school
            ? [
                {
                  label: 'อัปเดตข้อมูลโรงเรียนและบัญชีผู้ดูแลเดิม',
                  icon: 'solar:pen-bold' as const,
                },
                { label: 'กลับไปยังหน้ารายชื่อโรงเรียน', icon: 'eva:arrow-ios-back-fill' as const },
              ]
            : [
                {
                  label: 'สร้างบัญชีผู้ดูแลโรงเรียนให้อัตโนมัติ',
                  icon: 'solar:user-plus-bold' as const,
                },
                {
                  label: 'ส่งอีเมลเชิญพร้อมชื่อผู้ใช้งานและรหัสผ่านชั่วคราว',
                  icon: 'solar:letter-bold-duotone' as const,
                },
                {
                  label: 'ผู้ดูแลโรงเรียนเข้าสู่ระบบและเริ่มเพิ่มครู/นักเรียนเอง',
                  icon: 'solar:users-group-rounded-bold-duotone' as const,
                },
              ]
          ).map((item, index) => (
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
                <RemixIcon icon={item.icon} width={17} />
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
            {school
              ? 'การบันทึกจะไม่ส่งอีเมลเชิญซ้ำ'
              : 'สถานะเริ่มต้นของโรงเรียนจะเป็น “เปิดใช้งาน”'}
          </Alert>
        </Card>
      </Box>

      {emailPreview && (
        <Dialog
          open={emailPreviewOpen}
          onClose={() => setEmailPreviewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>พรีวิวอีเมลเชิญ</DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle2">{emailPreview.subject}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              พรีวิวด้วยข้อมูลตัวอย่าง
            </Typography>
            <Box
              component="iframe"
              title="ตัวอย่างอีเมลเชิญผู้ดูแลโรงเรียน"
              sandbox=""
              srcDoc={emailPreview.html}
              sx={{
                width: 1,
                height: 'min(62dvh, 620px)',
                display: 'block',
                border: 0,
                borderRadius: 1,
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmailPreviewOpen(false)}>ปิด</Button>
          </DialogActions>
        </Dialog>
      )}

      {school && (
        <Dialog
          open={resendOpen}
          onClose={() => !resendMutation.isPending && setResendOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>ส่งอีเมลเชิญอีกครั้ง</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              {resendRecipient ? (
                <>
                  ส่งคำเชิญไปที่ <strong>{resendRecipient}</strong>
                </>
              ) : (
                'ยังไม่ได้บันทึกอีเมลสำหรับส่งคำเชิญ'
              )}
            </Typography>
            {canSetTemporaryPassword && (
              <TextField
                fullWidth
                type="password"
                autoComplete="new-password"
                label="รหัสผ่านชั่วคราวใหม่"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                disabled={resendMutation.isPending}
                slotProps={{ htmlInput: { maxLength: 72 } }}
                helperText="อย่างน้อย 8 ตัวอักษร หากกรอก ระบบจะเปลี่ยนรหัสและส่งไปที่อีเมลของบัญชีผู้ดูแล"
                sx={{ mt: 2 }}
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {temporaryPassword
                ? 'ผู้รับต้องเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก'
                : 'ผู้รับใช้รหัสผ่านเดิมของบัญชี'}
            </Typography>
            {resendMutation.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {resendMutation.error.message}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              disabled={resendMutation.isPending}
              onClick={() => setResendOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              loading={resendMutation.isPending}
              disabled={
                !resendRecipient ||
                Boolean(
                  temporaryPassword &&
                  (temporaryPassword.trim().length < 8 ||
                    new TextEncoder().encode(temporaryPassword).length > 72)
                )
              }
              onClick={() => resendMutation.mutate(school.id)}
            >
              {temporaryPassword ? 'ตั้งรหัสผ่านและส่งอีเมล' : 'ส่งอีเมล'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog open={!!result} onClose={closeResultDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {result?.emailSent ? 'ส่งคำเชิญเรียบร้อย' : 'สร้างโรงเรียนสำเร็จ'}
        </DialogTitle>
        <DialogContent>
          {result?.adminCreated === false ? (
            <Alert severity="warning">{result.message}</Alert>
          ) : result?.emailSent ? (
            <Alert severity="success">ผู้ให้บริการรับคำขอส่งอีเมลเชิญไปยังอีเมลโรงเรียนแล้ว</Alert>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                สร้างบัญชีผู้ดูแลโรงเรียนสำเร็จ แต่ส่งอีเมลเชิญไม่สำเร็จ —
                กรุณาคัดลอกข้อมูลด้านล่างไปส่งให้โรงเรียนเอง
                {result?.emailError && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {result.emailError}
                  </Typography>
                )}
              </Alert>
              <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
                <TextField
                  label="ชื่อผู้ใช้งาน"
                  value={result?.adminUsername ?? ''}
                  slotProps={{ input: { readOnly: true } }}
                  fullWidth
                />
                <TextField
                  label="รหัสผ่านชั่วคราว"
                  value={result?.adminPassword ?? ''}
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: (
                        <Button size="small" onClick={copyPassword}>
                          คัดลอก
                        </Button>
                      ),
                    },
                  }}
                  fullWidth
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeResultDialog}>
            ไปที่รายการโรงเรียน
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
