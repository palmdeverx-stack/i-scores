'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from '../../hooks';
import { FormHead } from '../../components/form-head';
import { signInWithPassword } from '../../context/jwt';
import { getErrorMessage, getHomePathForRole } from '../../utils';

// ----------------------------------------------------------------------

export type SignInSchemaType = z.infer<typeof SignInSchema>;

export const SignInSchema = z.object({
  username: z.string().min(1, { error: 'กรุณากรอกชื่อผู้ใช้งาน!' }),
  password: z
    .string()
    .min(1, { error: 'กรุณากรอกรหัสผ่าน!' })
    .min(6, { error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!' }),
});

// ----------------------------------------------------------------------

export function JwtSignInView() {
  const router = useRouter();

  const showPassword = useBoolean();

  const { checkUserSession } = useAuthContext();

  const defaultValues: SignInSchemaType = {
    username: '',
    password: '',
  };

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const { handleSubmit } = methods;

  const signInMutation = useMutation({
    mutationFn: signInWithPassword,
    onSuccess: async (user) => {
      await checkUserSession?.();

      router.replace(getHomePathForRole(user.role));
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    signInMutation.mutate({ username: data.username, password: data.password });
  });

  const errorMessage = signInMutation.error ? getErrorMessage(signInMutation.error) : null;

  const renderForm = () => (
    <Box sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
      <Field.Text
        name="username"
        label="ชื่อผู้ใช้งาน"
        placeholder="กรอกชื่อผู้ใช้งาน"
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-rounded-bold" width={22} />
              </InputAdornment>
            ),
          },
        }}
      />

      <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Field.Text
          name="password"
          label="รหัสผ่าน"
          placeholder="6 ตัวอักษรขึ้นไป"
          type={showPassword.value ? 'text' : 'password'}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:lock-password-outline" width={22} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={showPassword.onToggle}
                    edge="end"
                    aria-label={showPassword.value ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    <Iconify
                      icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Button
        fullWidth
        color="primary"
        size="large"
        type="submit"
        variant="contained"
        loading={signInMutation.isPending}
        loadingIndicator="กำลังเข้าสู่ระบบ..."
        sx={(theme) => ({
          mt: 1,
          py: 1.4,
          fontSize: 16,
          color: 'common.white',
          background: `linear-gradient(135deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.primary.dark} 100%)`,
          boxShadow: theme.customShadows.primary,
          '&:hover': {
            background: `linear-gradient(135deg, ${theme.vars.palette.primary.dark} 0%, ${theme.vars.palette.primary.darker} 100%)`,
            boxShadow: theme.customShadows.z16,
          },
        })}
      >
        เข้าสู่ระบบ
      </Button>
    </Box>
  );

  return (
    <Box
      sx={(theme) => ({
        width: 1,
        p: { xs: 3, sm: 4.5 },
        borderRadius: 3.5,
        color: 'text.primary',
        border: '1px solid',
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.48),
        backgroundColor: varAlpha(theme.vars.palette.background.paperChannel, 0.92),
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: theme.customShadows.dialog,
        ...theme.applyStyles('dark', {
          borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.12),
          backgroundColor: varAlpha(theme.vars.palette.background.paperChannel, 0.92),
        }),
      })}
    >
      <Logo />

      <Typography
        variant="overline"
        sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.2 }}
      >
        CLASS GO
      </Typography>

      <FormHead
        title="ยินดีต้อนรับกลับมา"
        description="เข้าสู่ระบบเพื่อจัดการคะแนนและติดตามผลการเรียน"
        sx={{ mt: 0.5, mb: 4, textAlign: 'left' }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>
    </Box>
  );
}
