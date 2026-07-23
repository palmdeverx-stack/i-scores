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
import { UploadAvatar } from 'src/components/upload';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import {
  getTeacherProfile,
  deleteTeacherAvatar,
  uploadTeacherAvatar,
  updateTeacherProfile,
  type UpdateTeacherProfileParams,
} from '../teacher-profile-actions';

// ----------------------------------------------------------------------

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'กรุณากรอกชื่อ' }),
  lastName: z.string().trim().min(1, { error: 'กรุณากรอกนามสกุล' }),
  email: z.union([z.literal(''), z.email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' })]),
  username: z.string(),
});

type ProfileSchemaType = z.infer<typeof ProfileSchema>;

const AVATAR_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export function TeacherProfileView() {
  const queryClient = useQueryClient();
  const { checkUserSession } = useAuthContext();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: getTeacherProfile,
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
    mutationFn: (params: UpdateTeacherProfileParams) => updateTeacherProfile(params),
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(['teacher-profile'], updatedProfile);
      await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      await checkUserSession?.();
      methods.reset({
        firstName: updatedProfile.first_name ?? '',
        lastName: updatedProfile.last_name ?? '',
        email: updatedProfile.email ?? '',
        username: updatedProfile.username,
      });
    },
  });

  const refreshProfile = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] }),
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
    ]);
    await checkUserSession?.();
  };

  const avatarMutation = useMutation({
    mutationFn: uploadTeacherAvatar,
    onSuccess: refreshProfile,
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteTeacherAvatar,
    onSuccess: refreshProfile,
  });

  const onSubmit = methods.handleSubmit((values) =>
    mutation.mutate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
    })
  );

  if (isLoading) return <TeacherProfileSkeleton />;

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
          ไม่สามารถโหลดข้อมูลโปรไฟล์ครูได้ กรุณาลองใหม่อีกครั้ง
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
  const memberSince = new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.created_at));

  return (
    <Container maxWidth={false} sx={{ pb: 5 }}>
      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, sm: 4 },
          color: 'common.white',
          overflow: 'hidden',
          position: 'relative',
          background: (theme) =>
            `linear-gradient(135deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.main} 65%, ${theme.vars.palette.primary.light} 100%)`,
          '&::after': {
            top: -100,
            right: -40,
            width: 240,
            height: 240,
            content: '""',
            borderRadius: '50%',
            position: 'absolute',
            bgcolor: (theme) => varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
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
            sx={(theme) => ({
              width: { xs: 72, sm: 92 },
              height: { xs: 72, sm: 92 },
              fontSize: { xs: 26, sm: 34 },
              fontWeight: 800,
              color: 'primary.darker',
              bgcolor: 'common.white',
              border: `4px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.3)}`,
            })}
          >
            {initials}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
              โปรไฟล์ครูผู้สอน
            </Typography>
            <Typography component="h1" variant="h3" sx={{ overflowWrap: 'anywhere' }}>
              {displayName}
            </Typography>
            <Box sx={{ gap: 1, mt: 1.25, display: 'flex', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={profile.school?.name ?? 'ยังไม่มีข้อมูลโรงเรียน'}
                sx={(theme) => ({
                  color: 'common.white',
                  bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.16),
                })}
              />
              <Chip
                size="small"
                label={`${profile.summary.assignments} ชั้นเรียนที่รับผิดชอบ`}
                sx={(theme) => ({
                  color: 'common.white',
                  bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.16),
                })}
              />
            </Box>
          </Box>
        </Box>
      </Card>

      {(mutation.error || avatarMutation.error || deleteAvatarMutation.error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(mutation.error || avatarMutation.error || deleteAvatarMutation.error)?.message}
        </Alert>
      )}
      {(mutation.isSuccess || avatarMutation.isSuccess || deleteAvatarMutation.isSuccess) && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {avatarMutation.isSuccess
            ? 'อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว'
            : deleteAvatarMutation.isSuccess
              ? 'ลบรูปโปรไฟล์เรียบร้อยแล้ว'
              : 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว'}
        </Alert>
      )}

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
        }}
      >
        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Typography component="h2" variant="h6">
              ข้อมูลส่วนตัว
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 3, color: 'text.secondary' }}>
              แก้ไขข้อมูลที่ใช้แสดงแก่นักเรียนและผู้ดูแลโรงเรียน
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
                  placeholder="teacher@example.com"
                  autoComplete="email"
                />
                <Field.Text
                  name="username"
                  label="ชื่อผู้ใช้"
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

          <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography component="h2" variant="h6">
                  รายวิชาที่รับผิดชอบ
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  รายการล่าสุดที่ได้รับมอบหมาย
                </Typography>
              </Box>
              <Button component={RouterLink} href={paths.teacher.assignments} size="small">
                ดูทั้งหมด
              </Button>
            </Box>

            {profile.teaching_assignments.length ? (
              <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
                {profile.teaching_assignments.map((item) => (
                  <Box
                    key={item.id}
                    component={RouterLink}
                    href={paths.teacher.assignmentDetail(item.id)}
                    sx={{
                      gap: 1.5,
                      p: 2,
                      display: 'flex',
                      borderRadius: 2,
                      alignItems: 'center',
                      color: 'text.primary',
                      textDecoration: 'none',
                      bgcolor: 'background.neutral',
                      border: '1px solid transparent',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lighter' },
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      sx={{ color: 'primary.main', bgcolor: 'primary.lighter' }}
                    >
                      <Iconify icon="solar:notebook-bold-duotone" />
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" noWrap>
                        {item.subject?.code ? `${item.subject.code} · ` : ''}
                        {item.subject?.name ?? 'ไม่ระบุรายวิชา'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                        ห้อง {item.classroom?.name ?? '-'} · {item.semester?.name ?? '-'}
                      </Typography>
                    </Box>
                    {item.semester?.is_active && (
                      <Chip size="small" color="success" variant="soft" label="กำลังสอน" />
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">ยังไม่มีรายวิชาที่ได้รับมอบหมาย</Alert>
            )}
          </Card>
        </Box>

        <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6">
              รูปโปรไฟล์
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 3, color: 'text.secondary' }}>
              ใช้แสดงในหน้าโปรไฟล์ รายวิชา และเมนูบัญชีของคุณ
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <UploadAvatar
                value={profile.avatar_url ?? undefined}
                loading={avatarMutation.isPending}
                disabled={avatarMutation.isPending || deleteAvatarMutation.isPending}
                accept={AVATAR_ACCEPT}
                maxSize={MAX_AVATAR_SIZE}
                onDrop={(files) => {
                  const file = files[0];
                  if (file) avatarMutation.mutate(file);
                }}
                helperText={
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      คลิกหรือลากรูปมาวางเพื่อเปลี่ยนรูป
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      PNG, JPEG หรือ WEBP ขนาดไม่เกิน 2MB
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {profile.avatar_url && (
              <Button
                fullWidth
                color="error"
                variant="text"
                loading={deleteAvatarMutation.isPending}
                disabled={avatarMutation.isPending}
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={() => deleteAvatarMutation.mutate()}
                sx={{ mt: 2 }}
              >
                ลบรูปโปรไฟล์
              </Button>
            )}
          </Card>

          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography component="h2" variant="h6" sx={{ mb: 2.5 }}>
              ภาพรวมการสอน
            </Typography>
            <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
              <SummaryFact
                icon="solar:notebook-bold-duotone"
                label="รายการสอน"
                value={`${profile.summary.assignments} รายการ`}
              />
              <SummaryFact
                icon="solar:gallery-wide-bold"
                label="รายวิชา"
                value={`${profile.summary.subjects} วิชา`}
              />
              <SummaryFact
                icon="solar:users-group-rounded-bold"
                label="ห้องเรียน"
                value={`${profile.summary.classrooms} ห้อง`}
              />
              <SummaryFact
                icon="solar:home-angle-bold-duotone"
                label="โรงเรียน"
                value={profile.school?.name ?? 'ยังไม่มีข้อมูล'}
              />
            </Box>
          </Card>

          <Card variant="outlined" sx={{ p: 3 }}>
            <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
              <Avatar variant="rounded" sx={{ color: 'primary.main', bgcolor: 'primary.lighter' }}>
                <Iconify icon="solar:shield-keyhole-bold-duotone" />
              </Avatar>
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

type SummaryFactProps = {
  icon:
    | 'solar:notebook-bold-duotone'
    | 'solar:gallery-wide-bold'
    | 'solar:users-group-rounded-bold'
    | 'solar:home-angle-bold-duotone';
  label: string;
  value: string;
};

function SummaryFact({ icon, label, value }: SummaryFactProps) {
  return (
    <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
      <Avatar variant="rounded" sx={{ color: 'primary.main', bgcolor: 'primary.lighter' }}>
        <Iconify icon={icon} width={21} />
      </Avatar>
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

function TeacherProfileSkeleton() {
  return (
    <Container maxWidth="lg" aria-label="กำลังโหลดโปรไฟล์ครู" sx={{ pb: 5 }}>
      <Skeleton variant="rounded" height={184} sx={{ mb: 3, borderRadius: 2 }} />
      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
        }}
      >
        <Skeleton variant="rounded" height={560} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={410} sx={{ borderRadius: 2 }} />
      </Box>
    </Container>
  );
}
