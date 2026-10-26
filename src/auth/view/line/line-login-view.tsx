'use client';

import Script from 'next/script';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { startLineLogin } from 'src/auth/components/line-login-button';
import { completeLiffLogin, type LiffLoginClient } from 'src/auth/line-login-client';

declare global {
  interface Window {
    liff?: LiffLoginClient;
  }
}

export function LineLoginView() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const operation = useRef<Promise<string | null> | null>(null);
  const config = useQuery<{ enabled: boolean; liffId: string | null }>({
    queryKey: ['line-login-config'],
    queryFn: async () => {
      const response = await fetch('/api/auth/line/config');
      if (!response.ok) throw new Error('โหลดการตั้งค่า LINE ไม่สำเร็จ');
      return response.json();
    },
  });
  const liffId = config.data?.liffId;
  useEffect(() => {
    if (!ready || !liffId || !window.liff) return undefined;
    let active = true;
    operation.current ??= completeLiffLogin(window.liff, liffId);
    operation.current
      .then((redirectTo) => {
        if (active && redirectTo) window.location.replace(redirectTo);
      })
      .catch((failure: unknown) => {
        if (active)
          setError(failure instanceof Error ? failure.message : 'เข้าสู่ระบบ LINE ไม่สำเร็จ');
      });
    return () => {
      active = false;
    };
  }, [ready, liffId]);
  const message =
    error ||
    config.error?.message ||
    (config.data && !config.data.enabled ? 'ยังไม่ได้เปิดใช้งาน LINE Login' : '');
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      {config.data?.enabled && (
        <Script
          id="ekru-liff-sdk"
          src="https://static.line-scdn.net/liff/edge/2/sdk.js"
          strategy="afterInteractive"
          onReady={() => setReady(true)}
          onError={() => setError('โหลด LINE ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่')}
        />
      )}
      <Card sx={{ p: 4, maxWidth: 480, width: 1 }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5">เข้าสู่ระบบ E-KRU ด้วย LINE</Typography>
          {message ? (
            <Alert severity="error" sx={{ width: 1 }}>
              {message}
            </Alert>
          ) : (
            <>
              <CircularProgress aria-label="กำลังตรวจสอบ LINE" />
              <Typography role="status" color="text.secondary">
                กำลังตรวจสอบบัญชี LINE กรุณารอสักครู่
              </Typography>
            </>
          )}
          <Typography variant="body2" color="text.secondary">
            สำหรับบัญชีครูที่เชื่อม LINE Login ไว้แล้ว
            การเชื่อมครั้งแรกให้เข้าสู่ระบบเดิมแล้วไปที่โปรไฟล์
          </Typography>
          {message && config.data?.enabled && (
            <Button
              variant="contained"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                try {
                  await startLineLogin(
                    new URLSearchParams(window.location.search).get('intent') === 'link'
                      ? 'link'
                      : 'login'
                  );
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : 'ไม่สามารถเริ่มใหม่ได้');
                  setRetrying(false);
                }
              }}
            >
              ลองใหม่
            </Button>
          )}
          <Button component={RouterLink} href="/auth/jwt/sign-in">
            กลับหน้าเข้าสู่ระบบ
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
