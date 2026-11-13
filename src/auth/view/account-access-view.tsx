'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { Logo } from 'src/components/logo';

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
        <Box
          component="main"
          sx={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.neutral',
            px: { xs: 2, sm: 3 },
            py: { xs: 4, sm: 6 },
          }}
        >
          <Stack spacing={3} sx={{ width: 1, maxWidth: 520 }}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5}>
              <Logo
                href="/account/apps"
                aria-label="E-KRU แอปของฉัน"
                sx={{ width: 48, height: 48 }}
              />
              <Box>
                <Typography variant="h6">E-KRU</Typography>
                <Typography variant="caption" color="text.secondary">
                  ระบบบริหารจัดการโรงเรียน
                </Typography>
              </Box>
            </Stack>

            <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}>
              <Stack spacing={3} sx={{ p: { xs: 3, sm: 4 } }}>
                <Box>
                  <Chip
                    label="สำหรับครูและผู้ดูแลโรงเรียน"
                    size="small"
                    color="primary"
                    variant="soft"
                    sx={{ mb: 2 }}
                  />
                  <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
                    เข้าสู่บัญชีโรงเรียน
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ใช้บัญชีโรงเรียนเพื่อเข้าถึงงานสอนและจัดการโรงเรียนของคุณ
                  </Typography>
                </Box>

                <Alert severity="info" variant="outlined" sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    คุณกำลังใช้บัญชี Marketplace
                  </Typography>
                  บัญชีนี้ใช้สำหรับแอปส่วนบุคคล หากต้องการเข้าเมนูครูหรือผู้ดูแลโรงเรียน
                  กรุณาเข้าสู่ระบบด้วยบัญชีโรงเรียน
                </Alert>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    การใช้งานบัญชีโรงเรียน
                  </Typography>
                  <Stack spacing={2}>
                    {[
                      [
                        'เข้าสู่ระบบด้วยบัญชีเดิม',
                        'ใช้ชื่อผู้ใช้และรหัสผ่าน หรือ Google ที่ผูกกับบัญชีครูของคุณ',
                      ],
                      [
                        'เชื่อม LINE ได้จากหน้าโปรไฟล์',
                        'เมื่อเข้าสู่บัญชีโรงเรียนแล้ว สามารถเชื่อม LINE Login เพื่อใช้ครั้งถัดไป',
                      ],
                    ].map(([title, description], index) => (
                      <Stack key={title} direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            flexShrink: 0,
                            borderRadius: '50%',
                            bgcolor: 'background.neutral',
                            display: 'grid',
                            placeItems: 'center',
                            typography: 'caption',
                            fontWeight: 'fontWeightBold',
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">{title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {description}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
                <Box>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    loading={busy}
                    onClick={() => void switchAccount()}
                  >
                    {busy ? 'กำลังเปลี่ยนบัญชี…' : 'เข้าสู่ระบบด้วยบัญชีโรงเรียน'}
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
                  >
                    ระบบจะออกจากบัญชีปัจจุบันเพื่อให้คุณเข้าสู่บัญชีโรงเรียน
                  </Typography>
                </Box>
              </Stack>

              <Divider />
              <Stack
                spacing={1}
                alignItems="center"
                sx={{ px: 3, py: 2.5, bgcolor: 'background.neutral' }}
              >
                <Typography variant="body2" color="text.secondary">
                  ต้องการใช้แอปส่วนบุคคลต่อ?
                </Typography>
                <Button href="/account/apps" color="inherit" disabled={busy}>
                  กลับไปแอปของฉัน
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Box>
      </RoleRedirectGuard>
    </AuthGuard>
  );
}
