'use client';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';

import { InventoryReturnForm } from '../components/inventory-return-form';

export function InventoryReturnFormView() {
  const { user } = useAuthContext();
  const router = useRouter();
  const params = useSearchParams();
  const root = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  const back = `${root}/returns`;
  return (
    <Container maxWidth="lg" sx={{ pb: 6 }}>
      <Button component={RouterLink} href={back} color="inherit" sx={{ mb: 2 }}>
        กลับรายการรับคืน
      </Button>
      <Typography variant="h3" component="h1" sx={{ mb: 3 }}>
        สร้างใบรับคืนวัสดุ / ครุภัณฑ์
      </Typography>
      <InventoryReturnForm
        initialKind={params.get('kind') === 'equipment' ? 'equipment' : 'material'}
        initialSource={params.get('source') ?? ''}
        initialAsset={params.get('asset') ?? ''}
        onCancel={() => router.push(back)}
        onSaved={() => router.push(back)}
      />
    </Container>
  );
}
