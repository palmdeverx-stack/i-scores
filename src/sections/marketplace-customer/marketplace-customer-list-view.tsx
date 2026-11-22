'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { RemixIcon } from 'src/components/remix-icon';

import { listMarketplaceCustomerPurchases } from './marketplace-customer-actions';

const STATUS_LABELS: Record<string, string> = {
  active: 'ใช้งานได้',
  expired: 'หมดอายุ',
  revoked: 'เพิกถอน',
  refunded: 'คืนเงินแล้ว',
  pending: 'ยังไม่เริ่มใช้งาน',
};

const STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  active: 'success',
  expired: 'error',
  revoked: 'error',
  refunded: 'info',
  pending: 'warning',
};

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Bangkok',
});

const numberFormatter = new Intl.NumberFormat('th-TH');
const PAGE_SIZE = 25;

export function MarketplaceCustomerListView() {
  const [page, setPage] = useState(0);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['master-marketplace-customers', page, search],
    queryFn: () => listMarketplaceCustomerPurchases(page, search),
  });
  const purchases = query.data?.purchases ?? [];
  const total = query.data?.total ?? 0;

  return (
    <Container maxWidth="xl" sx={{ pb: 5 }}>
      <Box sx={{ mb: 3 }}>
        <Typography component="h1" variant="h4">
          ลูกค้า Marketplace
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          สิทธิ์รายบุคคลและพื้นที่ส่วนตัวที่ซื้อผ่าน EKRU Marketplace
        </Typography>
      </Box>

      <Card>
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            gap: 2,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography component="h2" variant="subtitle1">
            รายการสิทธิ์
            {query.data && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {numberFormatter.format(total)} รายการ
              </Typography>
            )}
          </Typography>
          <Box
            component="form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(input.trim());
              setPage(0);
            }}
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: { xs: 1, sm: 'auto' } }}
          >
            <TextField
              placeholder="ชื่อ อีเมล ชื่อผู้ใช้ หรือแพ็กเกจ"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              size="small"
              sx={{ flex: '1 1 180px', width: { sm: 300 } }}
              slotProps={{
                htmlInput: { maxLength: 200, 'aria-label': 'ค้นหาลูกค้าหรือแพ็กเกจ' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <RemixIcon icon="eva:search-fill" width={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button type="submit" variant="contained">
              ค้นหา
            </Button>
            {(input || search) && (
              <Button
                type="button"
                color="inherit"
                onClick={() => {
                  setInput('');
                  setSearch('');
                  setPage(0);
                }}
              >
                ล้าง
              </Button>
            )}
          </Box>
        </Box>

        {query.isError && (
          <Alert
            severity="error"
            sx={{ mx: { xs: 2, sm: 3 }, mb: 2 }}
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
          <Table
            sx={{ minWidth: 720 }}
            aria-label="รายการลูกค้า Marketplace รายบุคคล"
            aria-busy={query.isFetching}
          >
            <TableHead>
              <TableRow>
                <TableCell>ลูกค้า</TableCell>
                <TableCell>แพ็กเกจ</TableCell>
                <TableCell>สถานะสิทธิ์</TableCell>
                <TableCell>ระยะเวลาใช้งาน</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.isPending ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 7 }}>
                    <CircularProgress size={28} aria-label="กำลังโหลด" />
                  </TableCell>
                </TableRow>
              ) : !query.isError && purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 7 }}>
                    <Typography variant="subtitle2">
                      {search ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ยังไม่มีรายการซื้อ'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => {
                  const name =
                    [purchase.first_name, purchase.last_name].filter(Boolean).join(' ') ||
                    purchase.username;
                  return (
                    <TableRow key={purchase.id} hover sx={{ '& > td': { verticalAlign: 'top' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                          <Avatar
                            aria-hidden
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'primary.lighter',
                              color: 'primary.dark',
                              typography: 'subtitle2',
                            }}
                          >
                            {Array.from(name)[0]?.toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                            <Typography variant="subtitle2">{name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {purchase.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {purchase.username}
                            </Typography>
                            {!purchase.user_is_active && (
                              <Typography display="block" variant="caption" color="error.main">
                                บัญชีปิดใช้งาน
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>
                        <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                          {purchase.plan_code || 'ไม่ระบุแพ็กเกจ'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {purchase.workspace_type === 'personal' ? 'พื้นที่ส่วนตัว' : 'รายบุคคล'}
                        </Typography>
                        <Box component="details" sx={{ mt: 0.75, typography: 'caption' }}>
                          <Box
                            component="summary"
                            sx={{ cursor: 'pointer', color: 'primary.main' }}
                          >
                            รายละเอียดสิทธิ์
                          </Box>
                          <Box sx={{ color: 'text.secondary', overflowWrap: 'anywhere', mt: 0.75 }}>
                            {purchase.feature_keys.length > 0 && (
                              <Typography variant="caption" display="block">
                                {purchase.feature_keys.join(', ')}
                              </Typography>
                            )}
                            <Typography variant="caption" display="block">
                              เลขรายการสั่งซื้อ {purchase.order_item_id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={STATUS_LABELS[purchase.status] ?? purchase.status}
                          color={STATUS_COLORS[purchase.status] ?? 'default'}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography
                          variant="subtitle2"
                          color={purchase.status === 'expired' ? 'error.main' : 'text.primary'}
                        >
                          หมดอายุ {dateFormatter.format(new Date(purchase.expires_at))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          เริ่ม {dateFormatter.format(new Date(purchase.starts_at))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, value) => setPage(value)}
            labelDisplayedRows={({ from, to, count }) =>
              `${numberFormatter.format(from)}–${numberFormatter.format(to)} จาก ${numberFormatter.format(count)} รายการ`
            }
            getItemAriaLabel={(type) => (type === 'next' ? 'หน้าถัดไป' : 'หน้าก่อนหน้า')}
          />
        )}
      </Card>
    </Container>
  );
}
