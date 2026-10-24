'use client';

import type { InventoryMovementKind } from '../inventory-movement-schema';

import { useQuery } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventory } from '../inventory-actions';
import { InventoryMovementForm } from '../components/inventory-movement-form';

export function InventoryMovementFormView({ kind }: { kind: InventoryMovementKind }) {
  const { user } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = user?.role === 'school_admin' ? paths.admin.inventory : paths.teacher.inventory;
  const backPath = `${basePath}/${kind}`;
  const query = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
    enabled: Boolean(user?.school_id),
  });
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Button component={RouterLink} href={backPath} color="inherit" sx={{ mb: 2 }}>
        กลับหน้ารายการ
      </Button>
      <Typography component="h1" variant="h3">
        {kind === 'receive' ? 'รับเข้าพัสดุ' : 'สร้างใบขอเบิกพัสดุ'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        {kind === 'receive'
          ? 'บันทึกพัสดุที่รับเข้าเพื่อเพิ่มยอดคงเหลือของโรงเรียน'
          : 'สร้างรายการเพื่อขออนุมัติ ยังไม่ตัดสต็อกจนกว่าจะผ่านการอนุมัติ'}
      </Typography>
      {query.isPending ? (
        <CircularProgress aria-label="กำลังโหลดพัสดุ" />
      ) : query.error ? (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      ) : !query.data?.canManage ? (
        <Alert severity="warning">คุณไม่มีสิทธิ์ทำรายการพัสดุ</Alert>
      ) : !query.data.items.length ? (
        <Alert severity="info">ยังไม่มีพัสดุ กรุณาสร้างข้อมูลหลักพัสดุก่อนทำรายการ</Alert>
      ) : (
        <InventoryMovementForm
          inventory={query.data}
          kind={kind}
          initialItemId={searchParams.get('itemId') ?? ''}
          initialPurchaseId={searchParams.get('purchaseId') ?? ''}
          onCancel={() => router.push(backPath)}
          onSaved={() => router.push(backPath)}
        />
      )}
    </Container>
  );
}
