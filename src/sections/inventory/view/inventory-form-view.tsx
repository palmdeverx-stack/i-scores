'use client';

import { useQuery } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventory } from '../inventory-actions';
import { InventoryItemForm } from '../components/inventory-item-form';

export function InventoryFormView() {
  const { user } = useAuthContext();
  const router = useRouter();
  const masterRoot = user?.role === 'school_admin' ? '/admin/master-data' : '/teacher/master-data';
  const query = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
    enabled: Boolean(user?.school_id),
  });
  const canManage = query.data?.canManage ?? false;
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Button
        component={RouterLink}
        href={`${masterRoot}/inventory-items`}
        color="inherit"
        sx={{ mb: 2 }}
      >
        กลับหน้าข้อมูลหลักพัสดุ
      </Button>
      <Typography component="h1" variant="h3">
        เพิ่มพัสดุ
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        สร้างข้อมูลหลักพัสดุของโรงเรียน ก่อนนำไปใช้ในรายการรับเข้าและเบิกจ่าย
      </Typography>
      {query.isPending ? (
        <CircularProgress aria-label="กำลังโหลดข้อมูลกลาง" />
      ) : query.error ? (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      ) : !canManage ? (
        <Alert severity="warning">คุณไม่มีสิทธิ์เพิ่มพัสดุ</Alert>
      ) : (
        <InventoryItemForm
          inventory={query.data!}
          masterRoot={masterRoot}
          onCancel={() => router.push(`${masterRoot}/inventory-items`)}
          onSaved={() => router.push(`${masterRoot}/inventory-items`)}
        />
      )}
    </Container>
  );
}
