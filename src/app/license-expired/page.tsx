import type { Metadata } from 'next';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

import { RemixIcon } from 'src/components/remix-icon';

// ----------------------------------------------------------------------

export default function LicenseExpiredPage() {
  return (
    <Container
      maxWidth="sm"
      sx={{
        py: 10,
        minHeight: '100vh',
        display: 'grid',
        textAlign: 'center',
        alignContent: 'center',
      }}
    >
      <RemixIcon
        icon="solar:calendar-mark-bold-duotone"
        width={84}
        sx={{ mx: 'auto', color: 'warning.main' }}
      />
      <Typography component="h1" variant="h3" sx={{ mt: 3 }}>
        ระยะเวลาการใช้งานสิ้นสุดแล้ว
      </Typography>
      <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>
        ข้อมูลในพื้นที่ทำงานยังอยู่ครบ เมื่อต่ออายุสำเร็จ ระบบจะเปิด Workspace เดิมให้ใช้งานทันที
      </Typography>
      {CONFIG.marketplaceUrl ? (
        <Button
          size="large"
          variant="contained"
          href={CONFIG.marketplaceUrl}
          startIcon={<RemixIcon icon="solar:cart-large-2-bold" />}
          sx={{ mt: 4, mx: 'auto' }}
        >
          ต่ออายุที่ E-KRU Marketplace
        </Button>
      ) : null}
    </Container>
  );
}
