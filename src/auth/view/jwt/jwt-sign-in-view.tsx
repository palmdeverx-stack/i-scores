'use client';

import type { SignInSchemaType } from './sign-in-schema';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { getLineLoginMessage } from 'src/lib/line-login-messages';

import { Logo } from 'src/components/logo';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import { safeInternalPath } from 'src/auth/utils/safe-internal-path';

import { useAuthContext } from '../../hooks';
import { FormHead } from '../../components/form-head';
import { SignInSchema, SignInPinSchema } from './sign-in-schema';
import { getErrorMessage, getHomePathForRole } from '../../utils';
import { LineLoginButton } from '../../components/line-login-button';
// ----------------------------------------------------------------------
import { GoogleAuthButton } from '../../components/google-auth-button';
import { verifySignInPin, signInWithPassword } from '../../context/jwt';

export { SignInSchema } from './sign-in-schema';
export type { SignInSchemaType } from './sign-in-schema';

// ----------------------------------------------------------------------

export function JwtSignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const showPassword = useBoolean();
  const pinRole = searchParams.get('pinRole');
  const pinChallengeToken = searchParams.get('pinChallengeToken');
  const [googleError, setGoogleError] = useState('');
  const [passwordPinChallenge, setPinChallenge] = useState<{
    token: string;
    role: 'master_admin' | 'school_admin';
  } | null>(null);
  // Query parameters can change without remounting this page after Google login.
  const [dismissedPinToken, setDismissedPinToken] = useState<string | null>(null);
  const pinChallenge =
    pinChallengeToken &&
    pinChallengeToken !== dismissedPinToken &&
    (pinRole === 'master_admin' || pinRole === 'school_admin')
      ? { token: pinChallengeToken, role: pinRole }
      : passwordPinChallenge;

  const { checkUserSession } = useAuthContext();

  const defaultValues: SignInSchemaType = {
    username: '',
    password: '',
    pin: '',
  };

  const methods = useForm({
    resolver: zodResolver(pinChallenge ? SignInPinSchema : SignInSchema),
    defaultValues,
    reValidateMode: 'onBlur',
  });

  const { handleSubmit } = methods;

  const signInMutation = useMutation({
    mutationFn: signInWithPassword,
    onSuccess: async (result) => {
      if ('requiresPin' in result) {
        setPinChallenge({ token: result.pinChallengeToken, role: result.role });
        return;
      }

      await checkUserSession?.();

      router.replace(
        safeInternalPath(searchParams.get('returnTo'), true) ?? getHomePathForRole(result.role)
      );
    },
  });

  const verifyPinMutation = useMutation({
    mutationFn: verifySignInPin,
    onSuccess: async (user) => {
      await checkUserSession?.();

      router.replace(
        safeInternalPath(searchParams.get('returnTo'), true) ?? getHomePathForRole(user.role)
      );
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setGoogleError('');
    if (pinChallenge) {
      if (!/^\d{8}$/.test(data.pin)) {
        methods.setError('pin', { message: 'PIN ต้องเป็นตัวเลข 8 หลัก' });
        return;
      }
      verifyPinMutation.mutate({ pinChallengeToken: pinChallenge.token, pin: data.pin });
      return;
    }

    signInMutation.mutate({ username: data.username, password: data.password });
  });

  const error = pinChallenge ? verifyPinMutation.error : signInMutation.error;
  const errorMessage =
    googleError ||
    getLineLoginMessage(searchParams.get('lineError')) ||
    (error ? getErrorMessage(error) : null) ||
    searchParams.get('googleError');

  const renderForm = () => (
    <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
      {!pinChallenge ? (
        <>
          <Field.Text
            name="username"
            label="ชื่อผู้ใช้"
            placeholder="กรอกชื่อผู้ใช้หรือรหัสประจำตัว"
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <RemixIcon icon="solar:user-rounded-bold" width={22} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
            <Field.Text
              name="password"
              label="รหัสผ่าน"
              placeholder="กรอกรหัสผ่าน"
              type={showPassword.value ? 'text' : 'password'}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <RemixIcon icon="solar:lock-password-outline" width={22} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={showPassword.onToggle}
                        edge="end"
                        aria-label={showPassword.value ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        <RemixIcon
                          icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                        />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </>
      ) : (
        <Field.Code
          name="pin"
          length={8}
          gap={1}
          maxSize={40}
          autoFocus
          validateChar={(character) => /^\d$/.test(character)}
          slotProps={{ textField: { inputMode: 'numeric' } }}
        />
      )}

      <Button
        fullWidth
        color="primary"
        size="large"
        type="submit"
        variant="contained"
        loading={signInMutation.isPending || verifyPinMutation.isPending}
        loadingIndicator={pinChallenge ? 'กำลังตรวจสอบ PIN...' : 'กำลังเข้าสู่ระบบ...'}
        sx={(theme) => ({
          mt: 0.5,
          minHeight: 44,
          py: 1,
          fontSize: 15,
          color: 'common.white',
          background: `linear-gradient(135deg, ${theme.vars.palette.primary.main} 0%, ${theme.vars.palette.primary.dark} 100%)`,
          boxShadow: theme.customShadows.primary,
          '&:hover': {
            background: `linear-gradient(135deg, ${theme.vars.palette.primary.dark} 0%, ${theme.vars.palette.primary.darker} 100%)`,
            boxShadow: theme.customShadows.z16,
          },
        })}
      >
        {pinChallenge ? 'ยืนยัน PIN' : 'เข้าสู่ระบบ'}
      </Button>

      {pinChallenge && (
        <Button
          color="inherit"
          onClick={() => {
            setDismissedPinToken(pinChallengeToken);
            setPinChallenge(null);
            const params = new URLSearchParams(searchParams.toString());
            params.delete('pinChallengeToken');
            params.delete('pinRole');
            router.replace(`${paths.auth.jwt.signIn}${params.size ? `?${params}` : ''}`);
            methods.setValue('pin', '');
            methods.clearErrors();
            verifyPinMutation.reset();
          }}
        >
          กลับไปกรอกชื่อผู้ใช้งาน
        </Button>
      )}
    </Box>
  );

  return (
    <Box
      sx={(theme) => ({
        width: 1,
        p: { xs: 2.5, sm: 3 },
        borderRadius: 3,
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Logo disabled aria-label="โลโก้ EKRU" sx={{ width: 44, height: 44 }} />
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
            EKRU
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ระบบบริหารจัดการการศึกษา
          </Typography>
        </Box>
      </Box>

      <FormHead
        title={pinChallenge ? 'ยืนยัน PIN' : 'เข้าสู่ระบบ'}
        description={
          pinChallenge?.role === 'school_admin'
            ? 'กรอกรหัสโรงเรียน 8 หลักเพื่อเข้าสู่ระบบ'
            : pinChallenge
              ? 'กรอก PIN ผู้ดูแลระบบ 8 หลักเพื่อเข้าสู่ระบบ'
              : 'เข้าใช้งานด้วยบัญชีของคุณ'
        }
        sx={{ mb: 2.5, gap: 0.5, textAlign: 'left' }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box data-nosnippet>
        <Form methods={methods} onSubmit={onSubmit}>
          {renderForm()}
        </Form>
      </Box>

      {!pinChallenge && (
        <>
          <Divider sx={{ my: 2 }}>หรือ</Divider>
          <GoogleAuthButton intent="sign-in" onError={setGoogleError} />
          <LineLoginButton onError={setGoogleError} />
        </>
      )}
    </Box>
  );
}
