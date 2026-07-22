'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
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
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={signInMutation.isPending}
        loadingIndicator="กำลังเข้าสู่ระบบ..."
        sx={{
          mt: 1,
          py: 1.4,
          fontSize: 16,
          color: 'common.white',
          background: 'linear-gradient(135deg, #087F5B 0%, #0A5C45 100%)',
          boxShadow: '0 12px 24px rgba(8, 127, 91, 0.24)',
          '&:hover': {
            background: 'linear-gradient(135deg, #096F52 0%, #074D3A 100%)',
            boxShadow: '0 14px 28px rgba(8, 127, 91, 0.32)',
          },
        }}
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
        borderColor: 'rgba(255, 255, 255, 0.48)',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 28px 70px rgba(2, 28, 20, 0.28)',
        ...theme.applyStyles('dark', {
          borderColor: 'rgba(255, 255, 255, 0.12)',
          backgroundColor: 'rgba(25, 34, 31, 0.92)',
        }),
      })}
    >
      <Box
        sx={{
          mb: 2.5,
          width: 52,
          height: 52,
          display: 'grid',
          borderRadius: 2,
          placeItems: 'center',
          color: 'common.white',
          background: 'linear-gradient(135deg, #0A8F66 0%, #064C39 100%)',
          boxShadow: '0 10px 22px rgba(8, 127, 91, 0.22)',
        }}
      >
        <Iconify icon="solar:notebook-bold-duotone" width={30} />
      </Box>

      <Typography variant="overline" sx={{ color: '#087F5B', fontWeight: 800, letterSpacing: 1.2 }}>
        I-SCORES
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
