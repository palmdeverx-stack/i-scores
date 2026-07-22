'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { varAlpha } from 'minimal-shared/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import {
  getStudentProfile,
  updateStudentProfile,
  type UpdateStudentProfileParams,
} from '../student-profile-actions';

// ----------------------------------------------------------------------

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'กรุณากรอกชื่อ' }),
  lastName: z.string().trim().min(1, { error: 'กรุณากรอกนามสกุล' }),
  email: z.union([z.literal(''), z.email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' })]),
  username: z.string(),
});

type ProfileSchemaType = z.infer<typeof ProfileSchema>;

export function StudentProfileView() {
  const queryClient = useQueryClient();
  const { checkUserSession } = useAuthContext();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['student-profile'],
    queryFn: getStudentProfile,
  });

  const methods = useForm<ProfileSchemaType>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { firstName: '', lastName: '', email: '', username: '' },
    values: profile
      ? {
          firstName: profile.first_name ?? '',
          lastName: profile.last_name ?? '',
          email: profile.email ?? '',
          username: profile.username,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (params: UpdateStudentProfileParams) => updateStudentProfile(params),
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(['student-profile'], updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      await checkUserSession?.();
      methods.reset({
        firstName: updatedProfile.first_name ?? '',
        lastName: updatedProfile.last_name ?? '',
        email: updatedProfile.email ?? '',
        username: updatedProfile.username,
      });
    },
  });

  const onSubmit = methods.handleSubmit((values) =>
    mutation.mutate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
    })
  );

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง
        </Alert>
      </Container>
    );
  }

  const displayName =
    `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.username;
  const initials =
    [profile.first_name, profile.last_name]
      .filter(Boolean)
      .map((name) => name?.charAt(0))
      .join('') || profile.username.charAt(0).toUpperCase();
  const classroom = profile.enrollment?.classroom;
  const memberSince = new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.created_at));

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, sm: 4 },
          color: 'common.white',
          overflow: 'hidden',
          position: 'relative',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.main} 55%, ${theme.vars.palette.primary.light} 100%)`,
          '&::before': {
            top: -90,
            right: -40,
            width: 220,
            height: 220,
            content: '""',
            opacity: 0.14,
            borderRadius: '50%',
            position: 'absolute',
            bgcolor: 'common.white',
          },
        }}
      >
        <Box
          sx={{
            gap: { xs: 2, sm: 3 },
            zIndex: 1,
            display: 'flex',
            position: 'relative',
            alignItems: 'center',
          }}
        >
          <Avatar
            src={profile.avatar_url ?? undefined}
            aria-label={`รูปโปรไฟล์ของ ${displayName}`}
            sx={{
              width: { xs: 72, sm: 92 },
              height: { xs: 72, sm: 92 },
              fontSize: { xs: 26, sm: 34 },
              fontWeight: 800,
              color: 'primary.darker',
              bgcolor: 'common.white',
              border: (theme) =>
                `4px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.3)}`,
            }}
          >
            {initials}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
              โปรไฟล์นักเรียน
            </Typography>
            <Typography component="h1" variant="h3" sx={{ overflowWrap: 'anywhere' }}>
              {displayName}
            </Typography>
            <Box sx={{ gap: 1, mt: 1.25, display: 'flex', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={classroom ? `ห้อง ${classroom.name}` : 'ยังไม่มีห้องเรียน'}
                sx={(theme) => ({
                  color: 'common.white',
                  bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.16),
                })}
              />
              {profile.enrollment?.student_number && (
                <Chip
                  size="small"
                  label={`เลขที่ ${profile.enrollment.student_number}`}
                  sx={(theme) => ({
                    color: 'common.white',
                    bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.16),
                  })}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      {mutation.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {mutation.error.message}
        </Alert>
      )}
      {mutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว
        </Alert>
      )}

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
        }}
      >
        <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography component="h2" variant="h6">
            ข้อมูลส่วนตัว
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, mb: 3, color: 'text.secondary' }}>
            แก้ไขข้อมูลที่ใช้แสดงภายในระบบ สามารถเว้นอีเมลว่างได้
          </Typography>

          <Form methods={methods} onSubmit={onSubmit}>
            <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  gap: 2.5,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <Field.Text name="firstName" label="ชื่อ *" autoComplete="given-name" />
                <Field.Text name="lastName" label="นามสกุล *" autoComplete="family-name" />
              </Box>
              <Field.Text
                name="email"
                type="email"
                label="อีเมล"
                placeholder="student@example.com"
                autoComplete="email"
              />
              <Field.Text
                name="username"
                label="ชื่อผู้ใช้"
                value={profile.username}
                disabled
                helperText="ชื่อผู้ใช้เปลี่ยนเองไม่ได้ หากต้องการแก้ไขกรุณาติดต่อผู้ดูแลโรงเรียน"
              />

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  size="large"
                  variant="contained"
                  loading={mutation.isPending}
                  disabled={!methods.formState.isDirty}
                  loadingIndicator="กำลังบันทึก..."
                  startIcon={<Iconify icon="solar:check-circle-bold" />}
                  sx={{ width: { xs: 1, sm: 'auto' }, minWidth: 210 }}
                >
                  บันทึกการเปลี่ยนแปลง
                </Button>
              </Box>
            </Box>
          </Form>
        </Card>

        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography component="h2" variant="h6">
              รูปโปรไฟล์
            </Typography>
            <Avatar
              src={profile.avatar_url ?? undefined}
              alt={displayName}
              sx={{
                mx: 'auto',
                mt: 2.5,
                width: 112,
                height: 112,
                fontSize: 36,
                fontWeight: 800,
                color: 'primary.darker',
                bgcolor: 'primary.lighter',
                border: '4px solid',
                borderColor: 'primary.lighter',
              }}
            >
              {initials}
            </Avatar>
            <Alert severity="info" sx={{ mt: 2.5, textAlign: 'left' }}>
              รูปโปรไฟล์จัดการโดยผู้ดูแลโรงเรียน หากต้องการเปลี่ยนรูปกรุณาติดต่อผู้ดูแล
            </Alert>
          </Card>

          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6" sx={{ mb: 2.5 }}>
              ข้อมูลการเรียน
            </Typography>
            <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
              <ProfileFact
                icon="solar:users-group-rounded-bold"
                label="โรงเรียน"
                value={profile.school?.name ?? 'ยังไม่มีข้อมูล'}
              />
              <ProfileFact
                icon="solar:notebook-bold-duotone"
                label="ห้องเรียน"
                value={classroom?.name ?? 'ยังไม่ได้ลงทะเบียน'}
              />
              <ProfileFact
                icon="solar:calendar-date-bold"
                label="ปีการศึกษา"
                value={classroom?.academic_year?.year ?? 'ยังไม่มีข้อมูล'}
              />
              <ProfileFact
                icon="solar:user-rounded-bold"
                label="เลขประจำตัวในห้อง"
                value={profile.enrollment?.student_number ?? 'ยังไม่มีข้อมูล'}
              />
            </Box>
          </Card>

          <Card variant="outlined" sx={{ p: 3 }}>
            <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  display: 'grid',
                  borderRadius: 1.5,
                  color: 'primary.main',
                  placeItems: 'center',
                  bgcolor: 'primary.lighter',
                }}
              >
                <Iconify icon="solar:shield-keyhole-bold-duotone" width={24} />
              </Box>
              <Box>
                <Typography component="h2" variant="subtitle1">
                  ความปลอดภัยของบัญชี
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  เป็นสมาชิกตั้งแต่ {memberSince}
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              component={RouterLink}
              href={paths.auth.jwt.changePassword}
              variant="outlined"
              startIcon={<Iconify icon="ic:round-vpn-key" />}
              sx={{ mt: 2.5 }}
            >
              เปลี่ยนรหัสผ่าน
            </Button>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}

// ----------------------------------------------------------------------

type ProfileFactProps = {
  icon:
    | 'solar:users-group-rounded-bold'
    | 'solar:notebook-bold-duotone'
    | 'solar:calendar-date-bold'
    | 'solar:user-rounded-bold';
  label: string;
  value: string;
};

function ProfileFact({ icon, label, value }: ProfileFactProps) {
  return (
    <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          display: 'grid',
          borderRadius: 1.25,
          color: 'primary.main',
          placeItems: 'center',
          bgcolor: 'background.neutral',
        }}
      >
        <Iconify icon={icon} width={20} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function ProfileSkeleton() {
  return (
    <Container maxWidth="lg" aria-label="กำลังโหลดโปรไฟล์" sx={{ pb: 5 }}>
      <Skeleton variant="rounded" height={184} sx={{ mb: 3, borderRadius: 2 }} />
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
        }}
      >
        <Skeleton variant="rounded" height={520} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={390} sx={{ borderRadius: 2 }} />
      </Box>
    </Container>
  );
}
