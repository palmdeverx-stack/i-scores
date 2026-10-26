import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Box, Card, Alert, Stack, Button, Typography } from '@mui/material';

import { getSessionStatus } from 'src/lib/session-security';
import { SSO_ISSUER } from 'src/lib/marketplace-sso-crypto';
import { listMarketplaceApps } from 'src/lib/marketplace-app-catalog';
import { SignOutButton } from 'src/layouts/components/sign-out-button';
import { verifyAppToken, ACCESS_TOKEN_COOKIE } from 'src/lib/auth-token';

import { getHomePathForRole } from 'src/auth/utils/role-home-path';

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
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4">แอปของฉัน</Typography>
        <Typography color="text.secondary">
          บัญชี Marketplace · แสดงแอปตามแพ็กเกจที่ยังใช้งานได้
        </Typography>
        {!apps.length && (
          <Alert severity="info">
            ยังไม่มีแพ็กเกจที่ใช้งานได้สำหรับแอปส่วนบุคคล กรุณาตรวจสอบคำสั่งซื้อหรือการเปิดใช้งานใน
            Marketplace
          </Alert>
        )}
        {apps.map((app) => (
          <Card key={app.id} sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Typography variant="h6">{app.name}</Typography>
              <Button
                variant="contained"
                href={`/launch?app=${encodeURIComponent(app.code)}`}
                disabled={!app.available}
              >
                {app.available ? 'เปิดใช้งาน' : 'อยู่ระหว่างพัฒนา'}
              </Button>
            </Stack>
          </Card>
        ))}
        <Stack direction="row" spacing={2}>
          <Button href={SSO_ISSUER}>ไป Marketplace</Button>
          <Button href="/account/access">เข้าสู่บัญชีโรงเรียน</Button>
        </Stack>
        <Box sx={{ maxWidth: 240 }}>
          <SignOutButton />
        </Box>
      </Stack>
    </Box>
  );
}
