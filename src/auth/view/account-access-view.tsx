'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';
import { AuthGuard, RoleRedirectGuard } from 'src/auth/guard';

export function AccountAccessView() {
  const { user } = useAuthContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const switchAccount = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่');
      window.location.replace(paths.auth.jwt.signIn);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ดำเนินการไม่สำเร็จ');
      setBusy(false);
    }
  };
  return (
    <AuthGuard>
      <RoleRedirectGuard currentRole={user?.role} allowedRoles={['marketplace_user']}>
        <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
          <Card sx={{ p: 4, maxWidth: 480, width: 1 }}>
            <Stack spacing={2}>
              <Typography variant="h5">เข้าสู่ระบบ E-KRU ด้วยบัญชีโรงเรียน</Typography>
              <Alert severity="info">
                บัญชีปัจจุบันเป็นบัญชี Marketplace จึงยังเข้าเมนูครูหรือผู้ดูแลโรงเรียนไม่ได้
              </Alert>
              <Typography variant="body2">
                หากมีบัญชีครูอยู่แล้ว ให้เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน หรือ Google
                ของบัญชีครูเดิม แล้วเชื่อม LINE Login จากหน้าโปรไฟล์
              </Typography>
              <Button href="/account/apps">ใช้แอปตามแพ็กเกจ Marketplace</Button>
              {error && <Alert severity="error">{error}</Alert>}
              <Button variant="contained" disabled={busy} onClick={() => void switchAccount()}>
                เข้าสู่ระบบด้วยบัญชีโรงเรียน
              </Button>
            </Stack>
          </Card>
        </Box>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
