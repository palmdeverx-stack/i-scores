'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { listMarketplaceCustomerPurchases } from './marketplace-customer-actions';

const STATUS_LABELS: Record<string, string> = {
  active: 'ใช้งานได้',
  expired: 'หมดอายุ',
  revoked: 'เพิกถอน',
  refunded: 'คืนเงินแล้ว',
  pending: 'ยังไม่เริ่มใช้งาน',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
}

export function MarketplaceCustomerListView() {
  const [page, setPage] = useState(0);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['master-marketplace-customers', page, search],
    queryFn: () => listMarketplaceCustomerPurchases(page, search),
  });

  return (
    <Container maxWidth="xl">
      <Typography component="h1" variant="h4" sx={{ mb: 1 }}>
        ลูกค้า Marketplace
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        ผู้ซื้อแพ็กเกจรายบุคคลและพื้นที่ส่วนตัวจาก EKRU Marketplace
        แสดงหนึ่งแถวต่อรายการสิทธิ์ที่ซื้อ
      </Typography>
      <Card>
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(input.trim());
            setPage(0);
          }}
          sx={{ p: 2.5, gap: 1.5, display: 'flex', alignItems: 'center' }}
        >
          <TextField
            label="ค้นหาชื่อ อีเมล ชื่อผู้ใช้ หรือแพ็กเกจ"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <Button type="submit" variant="contained">
            ค้นหา
          </Button>
        </Box>
        {query.isError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => query.refetch()}>
                ลองอีกครั้ง
              </Button>
            }
          >
            {query.error.message}
          </Alert>
        )}
        <TableContainer>
          <Table sx={{ minWidth: 1000 }} aria-label="รายการลูกค้า Marketplace รายบุคคล">
            <TableHead>
              <TableRow>
                {[
                  'ผู้ใช้',
                  'แพ็กเกจ / สิทธิ์',
                  'ประเภท',
                  'สถานะสิทธิ์',
                  'เริ่มใช้งาน',
                  'หมดอายุ',
                ].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {query.isPending ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={28} aria-label="กำลังโหลด" />
                  </TableCell>
                </TableRow>
              ) : query.isError ? null : query.data.purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    ไม่พบรายการซื้อของลูกค้ารายบุคคล
                  </TableCell>
                </TableRow>
              ) : (
                query.data.purchases.map((purchase) => {
                  const status = purchase.status;
                  return (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {[purchase.first_name, purchase.last_name].filter(Boolean).join(' ') ||
                            purchase.username}
                        </Typography>
                        <Typography variant="body2">{purchase.email}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {purchase.username}
                          {!purchase.user_is_active ? ' · บัญชีปิดใช้งาน' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="subtitle2">
                          {purchase.plan_code || 'ไม่ระบุแพ็กเกจ'}
                        </Typography>
                        <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>
                          {purchase.feature_keys.join(', ')}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          รายการสั่งซื้อ: {purchase.order_item_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {purchase.workspace_type === 'personal' ? 'พื้นที่ส่วนตัว' : 'รายบุคคล'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[status] ?? status}
                          color={status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(purchase.starts_at)}</TableCell>
                      <TableCell>{formatDate(purchase.expires_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={query.data?.total ?? 0}
          page={page}
          rowsPerPage={25}
          rowsPerPageOptions={[25]}
          onPageChange={(_, value) => setPage(value)}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count} รายการ`}
          getItemAriaLabel={(type) => (type === 'next' ? 'หน้าถัดไป' : 'หน้าก่อนหน้า')}
        />
      </Card>
    </Container>
  );
}
