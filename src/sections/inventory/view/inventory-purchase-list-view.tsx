'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventoryPurchases } from '../inventory-purchase-actions';
import { purchaseStatusLabels as statusLabels } from '../inventory-purchase-status';

export function InventoryPurchaseListView({ approval = false }: { approval?: boolean }) {
  const { user } = useAuthContext();
  const root = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(10);
  const [filter, setFilter] = useState('all');
  const query = useQuery({
    queryKey: ['inventory-purchases', user?.school_id, user?.id],
    queryFn: loadInventoryPurchases,
    enabled: Boolean(user?.school_id),
  });
  const purchases = (query.data?.purchases ?? []).filter((p) =>
    approval ? p.status === 'submitted' : filter === 'all' || p.status === filter
  );
  const safePage = Math.min(page, Math.max(0, Math.ceil(purchases.length / rows) - 1));
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Box
        sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap', mb: 3 }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            {approval ? 'อนุมัติใบขอจัดซื้อ' : 'จัดซื้อพัสดุ'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            ขอจัดซื้อ → อนุมัติ → แนบใบสั่งซื้อ → รับเข้าบางส่วน / รับครบ
          </Typography>
        </Box>
        {!approval && query.data?.canManage && (
          <Box>
            <Button variant="contained" component={RouterLink} href={`${root}/purchases/new`}>
              สร้างใบขอจัดซื้อ
            </Button>
          </Box>
        )}
      </Box>
      {query.isPending && <CircularProgress aria-label="กำลังโหลดการจัดซื้อ" />}
      {query.error && (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      )}
      <Card>
        {!approval && (
          <Box sx={{ p: 2.5 }}>
            <TextField
              select
              label="สถานะ"
              size="small"
              value={filter}
              sx={{ minWidth: 240 }}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">ทุกสถานะ</MenuItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {[
                  'เลขที่ขอจัดซื้อ / เรื่อง',
                  'รายการ',
                  'ใบสั่งซื้อ / ผู้จำหน่าย',
                  'สถานะ',
                  'จัดการ',
                ].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.slice(safePage * rows, (safePage + 1) * rows).map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      PR-{String(purchase.purchase_number).padStart(6, '0')}
                    </Typography>
                    {purchase.title}
                  </TableCell>
                  <TableCell>{purchase.lines.length}</TableCell>
                  <TableCell>
                    {purchase.order_number || '—'}
                    <Typography variant="caption" component="div">
                      {purchase.supplier || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusLabels[purchase.status]}
                      color={
                        purchase.status === 'rejected'
                          ? 'error'
                          : purchase.status === 'received'
                            ? 'success'
                            : 'warning'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button component={RouterLink} href={`${root}/purchases/${purchase.id}`}>
                      {approval ? 'พิจารณา' : 'ดู / จัดการ'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!query.isPending && !purchases.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    ไม่มีรายการ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={purchases.length}
          page={safePage}
          rowsPerPage={rows}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, next) => setPage(next)}
          onRowsPerPageChange={(e) => {
            setRows(Number(e.target.value));
            setPage(0);
          }}
        />
      </Card>
    </Container>
  );
}
