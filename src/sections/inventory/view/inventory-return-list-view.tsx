'use client';

import type { InventoryReturnRecord } from '../inventory-return-actions';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';

import { RouterLink } from 'src/routes/components';

import { useTable, rowInPage, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventory } from '../inventory-actions';
import { loadInventoryReturns } from '../inventory-return-actions';

export function InventoryReturnListView() {
  const { user } = useAuthContext();
  const root = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InventoryReturnRecord | null>(null);
  const table = useTable({ defaultRowsPerPage: 10 });
  const query = useQuery({
    queryKey: ['inventory-returns', user?.school_id, user?.id],
    queryFn: loadInventoryReturns,
  });
  const inventory = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
  });
  const rows = (query.data?.returns ?? []).filter((row) =>
    `${row.return_number} ${row.returned_by} ${row.note}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const page = Math.min(table.page, Math.max(0, Math.ceil(rows.length / table.rowsPerPage) - 1));
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            รับคืนวัสดุ / ครุภัณฑ์
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            คืนวัสดุอ้างอิงใบเบิกเดิม และคืนครุภัณฑ์ตามทะเบียนรายชิ้น
          </Typography>
        </Box>
        {query.data?.canManage && (
          <Button component={RouterLink} href={`${root}/returns/new`} variant="contained">
            สร้างใบรับคืน
          </Button>
        )}
      </Box>
      {query.error && (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      )}
      <Card>
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            ใบรับคืนล่าสุด 100 ใบ
          </Typography>
          <TextField
            label="ค้นหาเลขใบรับคืน ผู้คืน หรือเหตุผล"
            value={search}
            fullWidth
            size="small"
            onChange={(event) => {
              setSearch(event.target.value);
              table.onResetPage();
            }}
            sx={{ mt: 1 }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['เลขใบรับคืน', 'ประเภท', 'วันที่คืน', 'ผู้คืน', 'จำนวนรายการ', 'จัดการ'].map(
                  (label) => (
                    <TableCell key={label}>{label}</TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rowInPage(rows, page, table.rowsPerPage).map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>RT-{String(row.return_number).padStart(6, '0')}</TableCell>
                  <TableCell>{row.kind === 'material' ? 'วัสดุ' : 'ครุภัณฑ์'}</TableCell>
                  <TableCell>{row.document_date}</TableCell>
                  <TableCell>{row.returned_by}</TableCell>
                  <TableCell>{row.lines.length}</TableCell>
                  <TableCell>
                    <Button onClick={() => setSelected(row)}>ดูรายการ</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    {query.isLoading ? 'กำลังโหลด…' : 'ไม่พบรายการรับคืน'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePaginationCustom
          count={rows.length}
          page={page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
        />
      </Card>
      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle>
          ใบรับคืน RT-{String(selected?.return_number ?? 0).padStart(6, '0')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            ผู้คืน: {selected?.returned_by} · วันที่ {selected?.document_date}
          </Typography>
          {selected?.source_document_id && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              อ้างอิงใบเบิก:{' '}
              {query.data?.sources.find((source) => source.id === selected.source_document_id)
                ?.document_number ?? selected.source_document_id}
            </Typography>
          )}
          {selected?.lines.map((line, index) => (
            <Box
              key={line.item_id ?? line.asset_id ?? index}
              sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Typography variant="subtitle2">
                {index + 1}.{' '}
                {line.asset_code ??
                  line.item_name ??
                  inventory.data?.items.find((item) => item.id === line.item_id)?.name ??
                  line.item_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selected.kind === 'material'
                  ? `คืน ${line.quantity} ${line.unit ?? inventory.data?.items.find((item) => item.id === line.item_id)?.unit ?? ''}`
                  : `${line.condition === 'good' ? 'ใช้งานได้' : 'ชำรุด / พักรอตรวจสอบ'} · ผู้รับผิดชอบเดิม ${line.custodian ?? '—'} · ${line.location ?? 'ไม่ระบุสถานที่'}`}
              </Typography>
            </Box>
          ))}
          <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            เหตุผล / รายละเอียด: {selected?.note}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
