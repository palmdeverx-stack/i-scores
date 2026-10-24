'use client';

import type { InventoryItem as Item } from './types';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
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

import { loadInventory } from './inventory-actions';
import { InventoryItemForm } from './components/inventory-item-form';
import { inventoryStockStatus, inventoryReplenishment } from './inventory-stock';

export function InventoryView({
  mode = 'items',
}: {
  mode?: 'master' | 'items' | 'receive' | 'issue' | 'history';
}) {
  const { user } = useAuthContext();
  const queryKey = ['school-inventory', user?.school_id, user?.id];
  const query = useQuery({ queryKey, queryFn: loadInventory, enabled: Boolean(user?.school_id) });
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [itemPage, setItemPage] = useState(0);
  const [itemRows, setItemRows] = useState(10);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRows, setHistoryRows] = useState(10);
  const masterRoot = user?.role === 'school_admin' ? '/admin/master-data' : '/teacher/master-data';
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const items = query.data?.items ?? [];
  const lowItems = items.filter((entry) => inventoryStockStatus(entry).key === 'low');
  const emptyItems = items.filter((entry) => inventoryStockStatus(entry).key === 'out');
  const visible = items.filter(
    (item) =>
      `${item.code} ${item.name} ${item.category} ${item.location} ${item.brand} ${item.model} ${item.barcode}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (stockFilter === 'all' || inventoryStockStatus(item).key === stockFilter) &&
      (typeFilter === 'all' || item.item_type === typeFilter)
  );
  const safeItemPage = Math.min(itemPage, Math.max(0, Math.ceil(visible.length / itemRows) - 1));
  const pagedItems = visible.slice(safeItemPage * itemRows, (safeItemPage + 1) * itemRows);
  const history = (query.data?.movements ?? []).filter(
    (movement) => mode === 'history' || movement.kind === mode
  );
  const safeHistoryPage = Math.min(
    historyPage,
    Math.max(0, Math.ceil(history.length / historyRows) - 1)
  );
  const pagedHistory = history.slice(
    safeHistoryPage * historyRows,
    (safeHistoryPage + 1) * historyRows
  );
  const canManage = query.data?.canManage ?? false;
  const openItem = (item: Item) => setEditingItem(item);
  const inventoryRoot = user?.role === 'school_admin' ? '/admin/inventory' : '/teacher/inventory';
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2, mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {
              {
                master: 'ข้อมูลหลักพัสดุ',
                items: 'ทะเบียนพัสดุ',
                receive: 'รับเข้าพัสดุ',
                issue: 'เบิกจ่ายพัสดุ',
                history: 'ประวัติรับเข้า–เบิกจ่าย',
              }[mode]
            }
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {mode === 'master'
              ? 'สร้างรายการพัสดุ พร้อมหมวดหมู่และหน่วยนับ ก่อนนำไปทำรายการรับเข้า–เบิกจ่าย'
              : 'ทะเบียนวัสดุ รับเข้า–เบิกจ่าย และยอดคงเหลือของโรงเรียน'}
          </Typography>
        </Box>
        {canManage && mode !== 'history' && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {mode === 'master' ? (
              <Button
                variant="contained"
                component={RouterLink}
                href={`${masterRoot}/inventory-items/new`}
              >
                เพิ่มพัสดุ
              </Button>
            ) : mode === 'items' ? (
              <Button
                component={RouterLink}
                href={`${masterRoot}/inventory-items`}
                variant="outlined"
              >
                จัดการข้อมูลหลักพัสดุ
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={!items.length}
                component={RouterLink}
                href={`${inventoryRoot}/${mode}/new`}
              >
                {mode === 'receive' ? 'รับเข้าพัสดุ' : 'เบิกจ่ายพัสดุ'}
              </Button>
            )}
          </Box>
        )}
      </Box>
      {query.isPending && (
        <Box role="status" sx={{ p: 5, textAlign: 'center' }}>
          <CircularProgress aria-label="กำลังโหลดพัสดุ" />
        </Box>
      )}
      {query.error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => query.refetch()}>
              ลองใหม่
            </Button>
          }
        >
          {query.error.message}
        </Alert>
      )}
      {query.data && (
        <>
          {!canManage && (
            <Alert severity="info" sx={{ mb: 2 }}>
              คุณมีสิทธิ์ดูข้อมูล หากต้องการทำรายการ ให้ผู้ดูแลโรงเรียนมอบสิทธิ์จัดการ “งานพัสดุ”
            </Alert>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              ['รายการพัสดุ', items.length],
              ['ใกล้หมด', lowItems.length],
              ['หมดคลัง', emptyItems.length],
            ].map(([label, value]) => (
              <Card key={label} variant="outlined" sx={{ p: 2.5 }}>
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h3">{value}</Typography>
              </Card>
            ))}
          </Box>
          {(emptyItems.length > 0 || lowItems.length > 0) && (
            <Alert severity={emptyItems.length ? 'error' : 'warning'} sx={{ mb: 3 }}>
              หมดคลัง {emptyItems.length} รายการ · ใกล้หมด {lowItems.length} รายการ —{' '}
              {[...emptyItems, ...lowItems]
                .slice(0, 5)
                .map((entry) => entry.name)
                .join(', ')}
              {emptyItems.length + lowItems.length > 5 ? ' และรายการอื่น ๆ' : ''}
            </Alert>
          )}
          {mode !== 'history' && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <Box sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  ทะเบียนพัสดุ
                </Typography>
                <TextField
                  label="ค้นหารหัส ชื่อ หมวดหมู่ หรือที่จัดเก็บ"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setItemPage(0);
                  }}
                  fullWidth
                  size="small"
                />
                <TextField
                  select
                  label="ประเภทพัสดุ"
                  size="small"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setItemPage(0);
                  }}
                  sx={{ mt: 2, mr: 2, minWidth: 180 }}
                >
                  <MenuItem value="all">ทุกประเภท</MenuItem>
                  <MenuItem value="material">วัสดุ</MenuItem>
                  <MenuItem value="equipment">ครุภัณฑ์</MenuItem>
                </TextField>
                <TextField
                  select
                  label="สถานะสต็อก"
                  value={stockFilter}
                  onChange={(event) => {
                    setStockFilter(event.target.value);
                    setItemPage(0);
                  }}
                  size="small"
                  sx={{ mt: 2, minWidth: 200 }}
                >
                  <MenuItem value="all">ทุกสถานะ</MenuItem>
                  <MenuItem value="low">ใกล้หมด (≤ MIN)</MenuItem>
                  <MenuItem value="out">หมดคลัง</MenuItem>
                  <MenuItem value="over">เกิน MAX</MenuItem>
                  <MenuItem value="normal">พร้อมใช้</MenuItem>
                </TextField>
              </Box>
              <TableContainer>
                <Table size="small" aria-label="ทะเบียนพัสดุ">
                  <TableHead>
                    <TableRow>
                      {[
                        'รหัส / รายการ',
                        'หมวดหมู่',
                        'ที่จัดเก็บ',
                        ...(mode === 'master'
                          ? ['หน่วยนับ']
                          : ['คงเหลือ', 'MIN / MAX', 'เติมถึง MAX', 'สถานะ']),
                        ...(canManage && mode !== 'items' ? ['จัดการ'] : []),
                      ].map((label) => (
                        <TableCell key={label}>{label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {item.image_path && (
                              <Box
                                component="img"
                                loading="lazy"
                                src={`/api/inventory/${item.id}/image?v=${encodeURIComponent(item.image_path)}`}
                                alt={item.name}
                                sx={{
                                  width: 48,
                                  height: 48,
                                  objectFit: 'contain',
                                  borderRadius: 1,
                                }}
                              />
                            )}
                            <Box>
                              <Typography variant="subtitle2">{item.name}</Typography>
                              <Chip
                                size="small"
                                variant="soft"
                                color={item.item_type === 'equipment' ? 'info' : 'default'}
                                label={item.item_type === 'equipment' ? 'ครุภัณฑ์' : 'วัสดุ'}
                                sx={{ mt: 0.5 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {[item.brand, item.model].filter(Boolean).join(' · ')}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.code}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.category || '—'}</TableCell>
                        <TableCell>{item.location || '—'}</TableCell>
                        <TableCell>
                          {mode === 'master'
                            ? item.unit
                            : `${item.quantity.toLocaleString('th-TH')} ${item.unit}`}
                        </TableCell>
                        {mode !== 'master' && (
                          <>
                            <TableCell>
                              {item.minimum_stock} /{' '}
                              {item.maximum_stock > 0 ? item.maximum_stock : 'ไม่กำหนด'}
                            </TableCell>
                            <TableCell>
                              {inventoryReplenishment(item) === null
                                ? '—'
                                : `${inventoryReplenishment(item)} ${item.unit}`}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={inventoryStockStatus(item).color}
                                label={inventoryStockStatus(item).label}
                              />
                            </TableCell>
                          </>
                        )}
                        {canManage && mode !== 'items' && (
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                sx={{ display: mode === 'master' ? undefined : 'none' }}
                                onClick={() => openItem(item)}
                              >
                                แก้ไข
                              </Button>
                              <Button
                                size="small"
                                sx={{ display: mode === 'receive' ? undefined : 'none' }}
                                component={RouterLink}
                                href={`${inventoryRoot}/receive/new?itemId=${item.id}`}
                              >
                                รับเข้า
                              </Button>
                              <Button
                                size="small"
                                color="warning"
                                sx={{ display: mode === 'issue' ? undefined : 'none' }}
                                disabled={!item.quantity}
                                component={RouterLink}
                                href={`${inventoryRoot}/issue/new?itemId=${item.id}`}
                              >
                                เบิกจ่าย
                              </Button>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {!visible.length && (
                      <TableRow>
                        <TableCell
                          colSpan={
                            (mode === 'master' ? 4 : 7) + (canManage && mode !== 'items' ? 1 : 0)
                          }
                          align="center"
                          sx={{ py: 5 }}
                        >
                          {items.length
                            ? 'ไม่พบรายการที่ค้นหา'
                            : 'ยังไม่มีพัสดุ สร้างรายการในเมนูข้อมูลหลักพัสดุก่อน แล้วจึงบันทึกรับเข้า'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={visible.length}
                page={safeItemPage}
                rowsPerPage={itemRows}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="รายการต่อหน้า"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
                onPageChange={(_, page) => setItemPage(page)}
                onRowsPerPageChange={(event) => {
                  setItemRows(Number(event.target.value));
                  setItemPage(0);
                }}
              />
            </Card>
          )}
          {mode !== 'items' && mode !== 'master' && (
            <Card variant="outlined">
              <Typography variant="h6" sx={{ p: 2.5 }}>
                ประวัติรับเข้า–เบิกจ่าย · ล่าสุด 100 รายการ
              </Typography>
              <TableContainer>
                <Table size="small" aria-label="ประวัติรับเข้าเบิกจ่าย">
                  <TableHead>
                    <TableRow>
                      {[
                        'เลขที่ใบ',
                        'วันเวลา',
                        'รายการ',
                        'ประเภท',
                        'จำนวน',
                        'ผู้ส่งมอบ / ผู้เบิก',
                        'หมายเหตุ',
                      ].map((label) => (
                        <TableCell key={label}>{label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedHistory.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {new Date(movement.created_at).toLocaleString('th-TH', {
                            timeZone: 'Asia/Bangkok',
                          })}
                        </TableCell>
                        <TableCell>
                          {items.find((item) => item.id === movement.item_id)?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={movement.kind === 'receive' ? 'success' : 'warning'}
                            label={movement.kind === 'receive' ? 'รับเข้า' : 'เบิกจ่าย'}
                          />
                        </TableCell>
                        <TableCell>
                          {movement.quantity}{' '}
                          {items.find((item) => item.id === movement.item_id)?.unit}
                        </TableCell>
                        <TableCell>{movement.recipient || '—'}</TableCell>
                        <TableCell>{movement.note || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {!query.data.movements.some(
                      (movement) => mode === 'history' || movement.kind === mode
                    ) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          ยังไม่มีรายการเคลื่อนไหว
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={history.length}
                page={safeHistoryPage}
                rowsPerPage={historyRows}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="รายการต่อหน้า"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
                onPageChange={(_, page) => setHistoryPage(page)}
                onRowsPerPageChange={(event) => {
                  setHistoryRows(Number(event.target.value));
                  setHistoryPage(0);
                }}
              />
            </Card>
          )}
        </>
      )}
      <Dialog open={Boolean(editingItem)} fullWidth maxWidth="md">
        {editingItem && query.data && (
          <InventoryItemForm
            key={editingItem.id}
            inventory={query.data}
            item={editingItem}
            masterRoot={masterRoot}
            dialog
            onCancel={() => setEditingItem(null)}
            onSaved={() => setEditingItem(null)}
          />
        )}
      </Dialog>
    </Container>
  );
}
