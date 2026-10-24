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
import { loadInventoryPurchaseDetail } from '../inventory-purchase-actions';
import { InventoryPurchaseRequestForm } from '../components/inventory-purchase-request-form';

export function InventoryPurchaseFormView({ id }: { id?: string }) {
  const { user } = useAuthContext();
  const router = useRouter();
  const root = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  const back = `${root}/purchases`;
  const query = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
    enabled: Boolean(user?.school_id),
  });
  const detail = useQuery({
    queryKey: ['inventory-purchase-detail', user?.school_id, user?.id, id],
    queryFn: () => loadInventoryPurchaseDetail(id!),
    enabled: Boolean(id && user?.school_id),
  });
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Button component={RouterLink} href={back} color="inherit" sx={{ mb: 2 }}>
        กลับหน้าจัดซื้อ
      </Button>
      <Typography component="h1" variant="h3">
        {id ? 'แก้ไขแบบร่างใบขอจัดซื้อ' : 'สร้างใบขอจัดซื้อ'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        ขออนุมัติจัดซื้อ ก่อนบันทึกใบสั่งซื้อและรับของเข้าคลัง
      </Typography>
      {query.isPending || (id && detail.isPending) ? (
        <CircularProgress aria-label="กำลังโหลดพัสดุ" />
      ) : query.error ? (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      ) : id && detail.error ? (
        <Alert severity="error">{detail.error.message}</Alert>
      ) : id && !detail.data?.canEditDraft ? (
        <Alert severity="warning">
          แบบร่างแก้ไขได้เฉพาะเจ้าของหรือผู้ดูแล และรายการที่ส่งแล้วไม่สามารถแก้ไขได้
        </Alert>
      ) : !query.data?.canManage ? (
        <Alert severity="warning">ไม่มีสิทธิ์สร้างใบขอจัดซื้อ</Alert>
      ) : (
        <InventoryPurchaseRequestForm
          key={id ?? 'new'}
          purchase={detail.data?.purchase}
          inventory={query.data}
          onSaved={() => router.push(back)}
          onCancel={() => router.push(back)}
        />
      )}
    </Container>
  );
}
