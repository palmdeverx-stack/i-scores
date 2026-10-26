'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Box,
  Card,
  Alert,
  Stack,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

import { marketplaceSsoMessage } from 'src/lib/marketplace-sso-messages';

import { useAuthContext } from 'src/auth/hooks';

export function MarketplaceSsoContinueView() {
  const { user, loading } = useAuthContext();
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [callbackError, setCallbackError] = useState('');
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) setCallbackError(marketplaceSsoMessage(code));
  }, []);
  const query = useQuery<{
    kind: 'pin' | 'link';
    displayName: string;
    role?: string;
    canCreate: boolean;
  }>({
    queryKey: ['marketplace-sso-pending'],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch('/api/auth/marketplace/pending');
      const data = await response.json();
      if (!response.ok) throw new Error(marketplaceSsoMessage(data.code));
      return data;
    },
  });
  const complete = async (action: 'pin' | 'link' | 'create' | 'switch-account') => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/marketplace/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pin: action === 'pin' ? pin : undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || marketplaceSsoMessage(data.code));
      window.location.replace(data.redirectTo);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ดำเนินการไม่สำเร็จ');
      setBusy(false);
    }
  };
  const data = query.data;
  const message = error || callbackError || query.error?.message;
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Card sx={{ p: 4, maxWidth: 520, width: 1 }}>
        <Stack spacing={2}>
          <Typography variant="h5">เปิดใช้งาน E-KRU</Typography>
          {message && <Alert severity="error">{message}</Alert>}
          {query.isPending && <CircularProgress aria-label="กำลังตรวจสอบ SSO" />}
          {data?.kind === 'pin' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void complete('pin');
              }}
            >
              <Stack spacing={2}>
                <Typography>
                  ยืนยัน PIN {data.role === 'master_admin' ? 'ผู้ดูแลระบบ' : 'โรงเรียน'}{' '}
                  ก่อนเข้าสู่ระบบ
                </Typography>
                <TextField
                  autoFocus
                  label="PIN 8 หลัก"
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  slotProps={{
                    htmlInput: { inputMode: 'numeric', maxLength: 8, autoComplete: 'off' },
                  }}
                />
                <Button type="submit" variant="contained" disabled={busy || pin.length !== 8}>
                  ยืนยัน PIN
                </Button>
              </Stack>
            </form>
          ) : (
            data?.kind === 'link' && (
              <>
                <Typography>
                  บัญชี Marketplace {data.displayName || ''} ยังไม่ได้เชื่อมกับบัญชีใน E-KRU
                </Typography>
                {data.canCreate && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      เริ่มใช้ในบทบาท Marketplace เพื่อเปิดแอปตาม License ที่ซื้อ
                      ระบบไม่สร้างบัญชีครูหรือโรงเรียนให้อัตโนมัติ
                    </Typography>
                    <Button
                      variant="contained"
                      disabled={busy}
                      onClick={() => void complete('create')}
                    >
                      เริ่มใช้บัญชี Marketplace
                    </Button>
                  </>
                )}
                {user && user.auth_provider !== 'marketplace' ? (
                  <>
                    <Typography variant="body2">
                      หรือยืนยันเชื่อมกับบัญชีปัจจุบัน: {user.username}
                    </Typography>
                    <Button
                      variant="outlined"
                      disabled={busy || loading}
                      onClick={() => void complete('link')}
                    >
                      ยืนยันเชื่อมกับบัญชีนี้
                    </Button>
                  </>
                ) : (
                  <Button disabled={busy} onClick={() => void complete('switch-account')}>
                    เข้าสู่ระบบด้วยบัญชี E-KRU เดิมเพื่อเชื่อมบัญชี
                  </Button>
                )}
              </>
            )
          )}
          <Button href="/auth/marketplace/start">เริ่ม SSO ใหม่</Button>
          <Button href="/account/apps">แอปของฉัน</Button>
        </Stack>
      </Card>
    </Box>
  );
}
