'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventory } from '../inventory-actions';
import { InventoryAssetRegisterForm } from '../components/inventory-asset-register-form';

export function InventoryAssetFormView() {
  const { user } = useAuthContext();
  const router = useRouter();
  const client = useQueryClient();
  const root = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  const back = `${root}/assets`;
  const query = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
    enabled: Boolean(user?.school_id),
  });
  const saved = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['inventory-assets'] }),
      client.invalidateQueries({ queryKey: ['inventory-asset-receipts'] }),
    ]);
    router.push(back);
  };
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Button component={RouterLink} href={back} color="inherit" sx={{ mb: 2 }}>
        กลับหน้าทะเบียนครุภัณฑ์
      </Button>
      <Typography variant="h3" component="h1">
        ขึ้นทะเบียนครุภัณฑ์รายชิ้น
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        อ้างอิงรายการรับเข้าและบันทึกข้อมูลเฉพาะของครุภัณฑ์แต่ละชิ้นก่อนนำไปใช้งาน
      </Typography>
      {query.isPending ? (
        <CircularProgress aria-label="กำลังโหลดข้อมูลครุภัณฑ์" />
      ) : query.error ? (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      ) : !query.data?.canManage ? (
        <Alert severity="warning">ไม่มีสิทธิ์ขึ้นทะเบียนครุภัณฑ์</Alert>
      ) : (
        <InventoryAssetRegisterForm
          inventory={query.data}
          onSaved={saved}
          onCancel={() => router.push(back)}
        />
      )}
    </Container>
  );
}
