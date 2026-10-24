'use client';

import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventoryPurchaseDetail } from '../inventory-purchase-actions';
import { purchaseStatusLabels, purchaseDocumentNumber } from '../inventory-purchase-status';
import {
  PurchaseOrderForm,
  PurchaseReviewForm,
} from '../components/inventory-purchase-review-forms';

const InventoryPurchasePreview = dynamic(() => import('../components/inventory-purchase-preview'), {
  ssr: false,
  loading: () => (
    <Typography role="status" sx={{ p: 4 }}>
      กำลังโหลดเอกสาร…
    </Typography>
  ),
});
export function InventoryPurchaseDetailView({ id }: { id: string }) {
  const { user } = useAuthContext();
  const client = useQueryClient();
  const root = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  const query = useQuery({
    queryKey: ['inventory-purchase-detail', user?.school_id, user?.id, id],
    queryFn: () => loadInventoryPurchaseDetail(id),
    enabled: Boolean(user?.school_id),
  });
  const refreshed = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['inventory-purchase-detail'] }),
      client.invalidateQueries({ queryKey: ['inventory-purchases'] }),
      client.invalidateQueries({ queryKey: ['school-inventory'] }),
    ]);
  };
  const detail = query.data;
  const purchase = detail?.purchase;
  return (
    <Container maxWidth={false} sx={{ pb: 6 }}>
      <Button
        component={RouterLink}
        href={`${root}/${detail && !detail.canManage ? 'purchase-approvals' : 'purchases'}`}
        color="inherit"
        sx={{ mb: 2 }}
      >
        กลับหน้ารายการจัดซื้อ
      </Button>
      {query.isPending && <CircularProgress aria-label="กำลังโหลดเอกสารจัดซื้อ" />}
      {query.error && (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      )}
      {detail && purchase && (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography component="h1" variant="h4">
                {purchaseDocumentNumber(purchase.purchase_number)} · {purchase.title}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                ใบขออนุมัติจัดซื้อพัสดุ · {detail.schoolName}
              </Typography>
            </Box>
            <Chip
              label={purchaseStatusLabels[purchase.status]}
              color={
                purchase.status === 'rejected'
                  ? 'error'
                  : purchase.status === 'received'
                    ? 'success'
                    : 'warning'
              }
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              alignItems: 'start',
              gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1fr) 340px' },
            }}
          >
            <InventoryPurchasePreview detail={detail} />
            <Card
              variant="outlined"
              sx={{ p: 3, display: 'grid', gap: 2, top: 88, position: { xl: 'sticky' } }}
            >
              <Typography variant="h6">จัดการใบจัดซื้อ</Typography>
              {detail.canEditDraft && (
                <Button
                  component={RouterLink}
                  href={`${root}/purchases/${purchase.id}/edit`}
                  variant="contained"
                >
                  แก้ไขแบบร่าง / ส่งอนุมัติ
                </Button>
              )}
              {purchase.status === 'submitted' && detail.canApprove ? (
                <PurchaseReviewForm key={purchase.id} purchase={purchase} onSaved={refreshed} />
              ) : purchase.status === 'approved' && detail.canManage ? (
                <PurchaseOrderForm key={purchase.id} purchase={purchase} onSaved={refreshed} />
              ) : (
                <Alert severity="info">{purchaseStatusLabels[purchase.status]}</Alert>
              )}
              {purchase.review_note && (
                <Alert
                  severity={purchase.status === 'rejected' ? 'error' : 'info'}
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {purchase.status === 'rejected' ? 'เหตุผลในการปฏิเสธ' : 'หมายเหตุการพิจารณา'}:{' '}
                  {purchase.review_note}
                </Alert>
              )}
              {purchase.attachment_path && (
                <Button
                  component="a"
                  href={`/api/inventory/purchases/${purchase.id}/attachment`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                >
                  เปิดไฟล์ใบสั่งซื้อ
                </Button>
              )}
              {['ordered', 'partially_received'].includes(purchase.status) && detail.canManage && (
                <Button
                  component={RouterLink}
                  href={`${root}/receive/new?purchaseId=${purchase.id}`}
                  variant="contained"
                >
                  รับของตามใบสั่งซื้อ
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                ดาวน์โหลด PDF จากแถบด้านบนเอกสารได้ทุกสถานะ
              </Typography>
            </Card>
          </Box>
        </>
      )}
    </Container>
  );
}
