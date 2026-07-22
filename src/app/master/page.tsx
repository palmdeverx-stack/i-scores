import type { Metadata } from 'next';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `ผู้ดูแลระบบ - ${CONFIG.appName}` };

export default function Page() {
  return (
    <Container sx={{ py: 10 }}>
      <Typography variant="h3">ผู้ดูแลระบบ</Typography>
    </Container>
  );
}
