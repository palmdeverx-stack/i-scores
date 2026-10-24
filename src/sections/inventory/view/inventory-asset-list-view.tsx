'use client';

import type { InventoryAsset } from '../types';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventory } from '../inventory-actions';
import { loadInventoryAssets } from '../inventory-asset-actions';
import { InventoryAssetActivateForm } from '../components/inventory-asset-activate-form';

export function InventoryAssetListView() {
  const { user } = useAuthContext();
  const client = useQueryClient();
  const root = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  const [selected, setSelected] = useState<InventoryAsset | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(10);
  const query = useQuery({
    queryKey: ['inventory-assets', user?.school_id, user?.id],
    queryFn: loadInventoryAssets,
    enabled: Boolean(user?.school_id),
  });
  const inventory = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
    enabled: Boolean(user?.school_id),
  });
  const assets = (query.data?.assets ?? []).filter((asset) => {
    const item = inventory.data?.items.find((entry) => entry.id === asset.item_id);
    return `${asset.asset_code} ${asset.serial_number} ${asset.custodian} ${asset.location ?? ''} ${item?.name ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  const safePage = Math.min(page, Math.max(0, Math.ceil(assets.length / rows) - 1));
  const saved = async () => {
    setSelected(null);
    await Promise.all([
      client.invalidateQueries({ queryKey: ['inventory-assets'] }),
      client.invalidateQueries({ queryKey: ['inventory-asset-receipts'] }),
    ]);
  };
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Box
        sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap', mb: 3 }}
      >
        <Box>
          <Typography variant="h3" component="h1">
            ทะเบียนครุภัณฑ์
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            รับเข้า → ขึ้นทะเบียนรายชิ้น → กำหนดผู้รับผิดชอบและนำไปใช้งาน
          </Typography>
        </Box>
        {query.data?.canManage && (
          <Box>
            <Button
              variant="contained"
              disabled={!inventory.data}
              component={RouterLink}
              href={`${root}/assets/new`}
            >
              ขึ้นทะเบียนครุภัณฑ์
            </Button>
          </Box>
        )}
      </Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        ครุภัณฑ์ไม่เบิกจ่ายแบบวัสดุสิ้นเปลือง ยอดในคลังเป็นจำนวนครุภัณฑ์รวม
        การนำไปใช้งานติดตามจากสถานะทะเบียนรายชิ้น
      </Alert>
      {(query.isPending || inventory.isPending) && (
        <CircularProgress aria-label="กำลังโหลดทะเบียนครุภัณฑ์" />
      )}
      {(query.error || inventory.error) && (
        <Alert severity="error">{query.error?.message || inventory.error?.message}</Alert>
      )}
      <Card>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="caption" color="text.secondary">
            ทะเบียนล่าสุด 100 รายการ
          </Typography>
          <TextField
            size="small"
            fullWidth
            label="ค้นหาเลขทะเบียน ชื่อ หมายเลขเครื่อง หรือผู้รับผิดชอบ"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ mt: 1 }}
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  'เลขทะเบียน / รายการ',
                  'Serial number',
                  'วันที่ได้มา',
                  'สถานะ',
                  'ผู้รับผิดชอบ / สถานที่',
                  'จัดการ',
                ].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.slice(safePage * rows, (safePage + 1) * rows).map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{asset.asset_code}</Typography>
                    {inventory.data?.items.find((item) => item.id === asset.item_id)?.name}
                  </TableCell>
                  <TableCell>{asset.serial_number || '—'}</TableCell>
                  <TableCell>{asset.acquisition_date}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={asset.status === 'in_use' ? 'success' : 'info'}
                      label={asset.status === 'in_use' ? 'ใช้งาน' : 'ขึ้นทะเบียนแล้ว'}
                    />
                  </TableCell>
                  <TableCell>
                    {asset.custodian || '—'}
                    <Typography variant="caption" component="div">
                      {asset.location || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {query.data?.canManage && asset.status === 'registered' && (
                      <Button onClick={() => setSelected(asset)}>นำไปใช้งาน</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!query.isPending && !assets.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    ยังไม่มีทะเบียนครุภัณฑ์
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={assets.length}
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
      <Dialog open={Boolean(selected)} fullWidth maxWidth="sm">
        <DialogTitle>นำครุภัณฑ์ไปใช้งาน</DialogTitle>
        <DialogContent>
          {selected && inventory.data && (
            <InventoryAssetActivateForm
              key={selected.id}
              asset={selected}
              inventory={inventory.data}
              onSaved={saved}
              onCancel={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
