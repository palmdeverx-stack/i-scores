import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Box, Card, Chip, Alert, Stack, Button, Divider, Typography } from '@mui/material';

import { getSessionStatus } from 'src/lib/session-security';
import { SSO_ISSUER } from 'src/lib/marketplace-sso-crypto';
import { listMarketplaceApps } from 'src/lib/marketplace-app-catalog';
import { SignOutButton } from 'src/layouts/components/sign-out-button';
import { verifyAppToken, ACCESS_TOKEN_COOKIE } from 'src/lib/auth-token';

import { Logo } from 'src/components/logo';

import { getHomePathForRole } from 'src/auth/utils/role-home-path';

function AppsIcon({ large = false }: { large?: boolean }) {
  return (
    <Box
      sx={{
        width: large ? 88 : 48,
        height: large ? 88 : 48,
        display: 'grid',
        placeItems: 'center',
        borderRadius: large ? 3 : 2,
        bgcolor: 'primary.lighter',
        color: 'primary.dark',
        flexShrink: 0,
      }}
    >
      <svg
        width={large ? 40 : 24}
        height={large ? 40 : 24}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M17.5 14v7M14 17.5h7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
}

export default async function Page() {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  const caller = token ? verifyAppToken(token) : null;
  if (!caller) redirect('/auth/jwt/sign-in?returnTo=%2Faccount%2Fapps');
  const status = await getSessionStatus(caller);
  if (status === 'error')
    return <Alert severity="error">ไม่สามารถตรวจสอบบัญชีได้ กรุณาลองใหม่</Alert>;
  if (status !== 'active') redirect('/auth/marketplace/start');
  if (caller.role !== 'marketplace_user') redirect(getHomePathForRole(caller.role));
  const apps = await listMarketplaceApps(caller.sub);
  return (
    <Box component="main" sx={{ minHeight: '100dvh', bgcolor: 'background.neutral' }}>
      <Box sx={{ maxWidth: 1080, mx: 'auto', px: { xs: 2, sm: 3, md: 5 }, py: { xs: 3, md: 6 } }}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Logo
                href="/account/apps"
                aria-label="E-KRU แอปของฉัน"
                sx={{ width: 48, height: 48 }}
              />
              <Box>
                <Typography variant="h6">E-KRU</Typography>
                <Typography variant="caption" color="text.secondary">
                  พื้นที่แอปส่วนบุคคล
                </Typography>
              </Box>
            </Stack>
            <Chip label="บัญชี Marketplace" size="small" variant="outlined" />
          </Stack>

          <Box>
            <Typography component="h1" variant="h4" sx={{ mb: 1 }}>
              แอปของฉัน
            </Typography>
            <Typography color="text.secondary">
              รวมแอปจากแพ็กเกจของคุณ พร้อมให้เริ่มใช้งานได้จากที่เดียว
            </Typography>
          </Box>

          <Card variant="outlined" sx={{ boxShadow: 'none', borderRadius: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: { xs: 2.5, md: 4 }, py: 2.5 }}
            >
              <Typography component="h2" variant="h6">
                แอปในบัญชีของคุณ
              </Typography>
              <Chip label={`${apps.length} แอป`} size="small" />
            </Stack>
            <Divider />
            {!apps.length ? (
              <Stack
                alignItems="center"
                spacing={2}
                sx={{ px: 3, py: { xs: 5, md: 7 }, textAlign: 'center' }}
              >
                <AppsIcon large />
                <Box sx={{ maxWidth: 440 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    เริ่มต้นใช้งานแอปของคุณ
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    คุณยังไม่มีแพ็กเกจที่ใช้งานได้สำหรับแอปส่วนบุคคล เลือกแพ็กเกจที่เหมาะกับคุณได้ใน
                    Marketplace
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  href={SSO_ISSUER}
                  sx={{ mt: 1, px: 3 }}
                >
                  สำรวจแอปใน Marketplace
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420 }}>
                  ซื้อแพ็กเกจแล้ว? ตรวจสอบคำสั่งซื้อและสถานะการเปิดใช้งานใน Marketplace
                </Typography>
              </Stack>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                  p: { xs: 2, md: 3 },
                }}
              >
                {apps.map((app) => (
                  <Stack
                    key={app.id}
                    spacing={2.5}
                    sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2 }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <AppsIcon />
                      <Box>
                        <Typography variant="subtitle1">{app.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {app.available ? 'พร้อมใช้งาน' : 'อยู่ระหว่างพัฒนา'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      variant="contained"
                      color="primary"
                      href={`/launch?app=${encodeURIComponent(app.code)}`}
                      disabled={!app.available}
                    >
                      {app.available ? 'เปิดใช้งานแอป' : 'อยู่ระหว่างพัฒนา'}
                    </Button>
                  </Stack>
                ))}
              </Box>
            )}
          </Card>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={{
              p: 3,
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="subtitle1">มีบัญชีโรงเรียนอยู่แล้ว?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                เข้าสู่ระบบเพื่อใช้งานสำหรับครูและผู้ดูแลโรงเรียน
              </Typography>
            </Box>
            <Button variant="outlined" href="/account/access" sx={{ flexShrink: 0 }}>
              เข้าสู่บัญชีโรงเรียน
            </Button>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Button href={SSO_ISSUER} color="inherit" size="small">
              ไป Marketplace
            </Button>
            <SignOutButton variant="text" size="small" fullWidth={false} sx={{ px: 2 }} />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
