'use client';

import type { StaffMasterItem, StaffMasterCategory } from '../staff-master-actions';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import {
  listStaffMasterItems,
  createStaffMasterItem,
  deleteStaffMasterItem,
  updateStaffMasterItem,
} from '../staff-master-actions';

// ----------------------------------------------------------------------

const CATEGORIES: Array<{
  value: StaffMasterCategory;
  label: string;
  singular: string;
  description: string;
}> = [
  {
    value: 'staff_type',
    label: 'ประเภทบุคลากร',
    singular: 'ประเภทบุคลากร',
    description: 'ใช้กำหนดเมนูและสิทธิ์เริ่มต้นของบัญชี role teacher',
  },
  {
    value: 'position',
    label: 'ตำแหน่ง',
    singular: 'ตำแหน่ง',
    description: 'รายการตำแหน่งที่เลือกใช้ในข้อมูลการทำงาน',
  },
  {
    value: 'academic_rank',
    label: 'วิทยฐานะ',
    singular: 'วิทยฐานะ',
    description: 'รายการวิทยฐานะที่เลือกใช้ในข้อมูลการทำงาน',
  },
];

const ItemSchema = z.object({
  nameTh: z.string().trim().min(1, { error: 'กรุณากรอกชื่อภาษาไทย' }),
  nameEn: z.string().trim(),
  sortOrder: z
    .string()
    .regex(/^\d+$/, { error: 'ลำดับต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป' }),
  isActive: z.boolean(),
});

type ItemForm = z.infer<typeof ItemSchema>;

type Props = {
  initialCategory?: StaffMasterCategory;
};

export function StaffMasterListView({ initialCategory = 'staff_type' }: Props) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<StaffMasterCategory>(initialCategory);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StaffMasterItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<StaffMasterItem | null>(null);

  useEffect(() => {
    setCategory(initialCategory);
    setPage(0);
    setQuery('');
  }, [initialCategory]);

  const itemsQuery = useQuery({
    queryKey: ['staff-master-items'],
    queryFn: listStaffMasterItems,
  });
  const methods = useForm<ItemForm>({
    resolver: zodResolver(ItemSchema),
    defaultValues: { nameTh: '', nameEn: '', sortOrder: '0', isActive: true },
  });
  const { reset, handleSubmit } = methods;

  const saveMutation = useMutation({
    mutationFn: (values: ItemForm) =>
      editingItem
        ? updateStaffMasterItem(editingItem.id, {
            ...values,
            sortOrder: Number(values.sortOrder),
          })
        : createStaffMasterItem({
            category,
            ...values,
            sortOrder: Number(values.sortOrder),
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-master-items'] });
      closeDialog();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaffMasterItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-master-items'] });
      setDeletingItem(null);
    },
  });

  const categoryConfig = CATEGORIES.find((item) => item.value === category)!;
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('th');
    return (itemsQuery.data ?? []).filter(
      (item) =>
        item.category === category &&
        (!normalizedQuery ||
          item.name.toLocaleLowerCase('th').includes(normalizedQuery) ||
          item.name_en?.toLocaleLowerCase().includes(normalizedQuery) ||
          item.code?.toLocaleLowerCase().includes(normalizedQuery))
    );
  }, [category, itemsQuery.data, query]);
  const visibleItems = filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function closeDialog() {
    setDialogOpen(false);
    setEditingItem(null);
    reset({ nameTh: '', nameEn: '', sortOrder: '0', isActive: true });
    saveMutation.reset();
  }

  function openCreate() {
    setEditingItem(null);
    reset({
      nameTh: '',
      nameEn: '',
      sortOrder: String(filteredItems.length * 10 + 10),
      isActive: true,
    });
    saveMutation.reset();
    setDialogOpen(true);
  }

  function openEdit(item: StaffMasterItem) {
    setEditingItem(item);
    reset({
      nameTh: item.name,
      nameEn: item.name_en ?? '',
      sortOrder: String(item.sort_order),
      isActive: item.is_active,
    });
    saveMutation.reset();
    setDialogOpen(true);
  }

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
      <Box
        sx={{
          mb: 3,
          gap: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">ข้อมูลหลักบุคลากร</Typography>
          <Typography sx={{ mt: 1, color: 'text.secondary' }}>
            จัดการประเภทบุคลากร ตำแหน่ง และวิทยฐานะของโรงเรียน
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RemixIcon icon="mingcute:add-line" />}
          onClick={openCreate}
        >
          เพิ่ม{categoryConfig.singular}
        </Button>
      </Box>

      <Card>
        <Tabs
          value={category}
          onChange={(_, value: StaffMasterCategory) => {
            setCategory(value);
            setPage(0);
            setQuery('');
          }}
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {CATEGORIES.map((item) => (
            <Tab key={item.value} value={item.value} label={item.label} />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {categoryConfig.description}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={query}
            placeholder={`ค้นหา${categoryConfig.singular}`}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: <RemixIcon icon="solar:magnifer-linear" />,
              },
            }}
          />
        </Box>

        {itemsQuery.isError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
            ไม่สามารถโหลดข้อมูลหลักบุคลากรได้
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ชื่อภาษาไทย</TableCell>
                <TableCell>ชื่อภาษาอังกฤษ</TableCell>
                {category === 'staff_type' && <TableCell>รหัสระบบ</TableCell>}
                <TableCell align="center">ลำดับ</TableCell>
                <TableCell align="center">สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{item.name}</Typography>
                    {item.is_system && <Chip size="small" label="รายการระบบ" sx={{ mt: 0.5 }} />}
                  </TableCell>
                  <TableCell>{item.name_en || '-'}</TableCell>
                  {category === 'staff_type' && (
                    <TableCell><Typography variant="body2">{item.code}</Typography></TableCell>
                  )}
                  <TableCell align="center">{item.sort_order}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={item.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      color={item.is_active ? 'success' : 'default'}
                      variant="soft"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="แก้ไข">
                      <IconButton onClick={() => openEdit(item)}>
                        <RemixIcon icon="solar:pen-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={item.is_system ? 'รายการระบบลบไม่ได้' : 'ลบ'}>
                      <span>
                        <IconButton
                          color="error"
                          disabled={item.is_system}
                          onClick={() => {
                            deleteMutation.reset();
                            setDeletingItem(item);
                          }}
                        >
                          <RemixIcon icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!itemsQuery.isLoading && !visibleItems.length && (
                <TableRow>
                  <TableCell colSpan={category === 'staff_type' ? 6 : 5} align="center" sx={{ py: 8 }}>
                    ไม่พบรายการ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredItems.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
        />
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <Form methods={methods} onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
          <DialogTitle>
            {editingItem ? `แก้ไข${categoryConfig.singular}` : `เพิ่ม${categoryConfig.singular}`}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Field.Text name="nameTh" label="ชื่อภาษาไทย *" />
            <Field.Text name="nameEn" label="ชื่อภาษาอังกฤษ" />
            <Field.Text name="sortOrder" label="ลำดับการแสดง" type="number" />
            {editingItem && (
              <Field.Switch
                name="isActive"
                label="เปิดใช้งาน"
                helperText="รายการที่ปิดใช้งานจะไม่แสดงเป็นตัวเลือกสำหรับข้อมูลใหม่"
              />
            )}
            {saveMutation.error && <Alert severity="error">{saveMutation.error.message}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={closeDialog}>ยกเลิก</Button>
            <Button type="submit" variant="contained" loading={saveMutation.isPending}>
              บันทึก
            </Button>
          </DialogActions>
        </Form>
      </Dialog>

      <Dialog open={!!deletingItem} onClose={() => setDeletingItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <Typography>
            ต้องการลบ “{deletingItem?.name}” หรือไม่?
          </Typography>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>{deleteMutation.error.message}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDeletingItem(null)}>ยกเลิก</Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
          >
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
