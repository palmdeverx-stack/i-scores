'use client';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { getSupabaseBrowserClient } from 'src/lib/supabase-browser';

import { getHomePathForRole } from 'src/auth/utils';

// ----------------------------------------------------------------------

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const completeGoogleAuth = async () => {
      try {
        const code = searchParams.get('code');
        if (!code) throw new Error(searchParams.get('error_description') ?? 'ไม่พบ OAuth code');

        const { data, error } =
          await getSupabaseBrowserClient().auth.exchangeCodeForSession(code);
        if (error || !data.session) throw error ?? new Error('ไม่พบ Google session');

        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            intent: searchParams.get('intent') === 'sign-up' ? 'sign-up' : 'sign-in',
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้');

        if (result.marketplaceOnly) {
          if (!result.redirectUrl) {
            throw new Error('ยังไม่ได้กำหนด URL ของ Marketplace');
          }
          window.location.replace(result.redirectUrl);
          return;
        }
        if (result.requiresPin) {
          const params = new URLSearchParams({
            pinChallengeToken: result.pinChallengeToken,
            pinRole: result.role,
          });
          router.replace(`${paths.auth.jwt.signIn}?${params.toString()}`);
          return;
        }

        router.replace(getHomePathForRole(result.user?.role));
      } catch (callbackError) {
        const message =
          callbackError instanceof Error
            ? callbackError.message
            : 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้';
        router.replace(
          `${paths.auth.jwt.signIn}?googleError=${encodeURIComponent(message)}`
        );
      }
    };

    void completeGoogleAuth();
  }, [router, searchParams]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        gap: 2,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
      <Typography variant="h6">กำลังตรวจสอบบัญชี Google</Typography>
      <Alert severity="info">กรุณาอย่าปิดหน้าต่างนี้</Alert>
    </Box>
  );
}

