'use client';

import type { InventoryDocument } from '../types';

import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventory, reviewInventoryDocument } from '../inventory-actions';

const ReviewSchema = z
  .object({ approve: z.boolean(), note: z.string().trim().max(1000) })
  .refine((v) => v.approve || Boolean(v.note), {
    path: ['note'],
    message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ',
  });

export function InventoryDocumentListView({
  approval = false,
  kind = 'issue',
}: {
  approval?: boolean;
  kind?: 'receive' | 'issue';
}) {
  const { user } = useAuthContext();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
    enabled: Boolean(user?.school_id),
  });
  const [selected, setSelected] = useState<InventoryDocument | null>(null);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(10);
  const methods = useForm<z.infer<typeof ReviewSchema>>({
    resolver: zodResolver(ReviewSchema),
    defaultValues: { approve: true, note: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof ReviewSchema>) =>
      reviewInventoryDocument({ id: selected!.id, ...values }),
    onSuccess: async () => {
      setSelected(null);
      await client.invalidateQueries({ queryKey: ['school-inventory'] });
    },
    onError: async () => {
      await client.invalidateQueries({ queryKey: ['school-inventory'] });
    },
  });
  const docs = (query.data?.documents ?? []).filter(
    (doc) => doc.kind === kind && (!approval || doc.status === 'submitted')
  );
  const safePage = Math.min(page, Math.max(0, Math.ceil(docs.length / rows) - 1));
  const root = user?.role === 'school_admin' ? paths.admin.inventory : paths.teacher.inventory;
  const open = (doc: InventoryDocument) => {
    mutation.reset();
    methods.reset({ approve: true, note: '' });
    setSelected(doc);
  };
  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      <Box
        sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mb: 3, flexWrap: 'wrap' }}
      >
        <Box>
          <Typography variant="h3" component="h1">
            {approval ? 'อนุมัติใบขอเบิก' : kind === 'receive' ? 'ใบรับเข้าพัสดุ' : 'ใบขอเบิกพัสดุ'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            แสดงล่าสุด 100 ใบ ·{' '}
            {kind === 'issue'
              ? 'ตัดสต็อกเมื่ออนุมัติทั้งใบเท่านั้น'
              : 'รับเข้าหลายรายการตามเลขที่เอกสาร'}
          </Typography>
        </Box>
        {!approval && query.data?.canManage && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button component={RouterLink} href={`${root}/${kind}/new`} variant="contained">
              {kind === 'receive' ? 'สร้างใบรับเข้า' : 'สร้างใบขอเบิก'}
            </Button>
          </Box>
        )}
      </Box>
      {query.isPending && <CircularProgress aria-label="กำลังโหลดใบพัสดุ" />}
      {query.error && (
        <Alert severity="error" action={<Button onClick={() => query.refetch()}>ลองใหม่</Button>}>
          {query.error.message}
        </Alert>
      )}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {[
                  'เลขที่ใบ',
                  'เอกสารอ้างอิง / วันที่',
                  'ผู้ส่งมอบ / ผู้รับ',
                  'จำนวนรายการ',
                  'สถานะ',
                  'จัดการ',
                ].map((title) => (
                  <TableCell key={title}>{title}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.slice(safePage * rows, (safePage + 1) * rows).map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    {doc.kind === 'receive' ? 'IN' : 'OUT'}-
                    {String(doc.document_number).padStart(6, '0')}
                  </TableCell>
                  <TableCell>
                    {doc.reference_number || '—'}
                    <Typography variant="caption" component="div">
                      {doc.document_date || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{doc.recipient || '—'}</TableCell>
                  <TableCell>{doc.lines.length}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={
                        doc.status === 'submitted'
                          ? 'warning'
                          : doc.status === 'posted'
                            ? 'success'
                            : 'error'
                      }
                      label={
                        doc.status === 'submitted'
                          ? 'รออนุมัติ'
                          : doc.status === 'posted'
                            ? 'บันทึกสต็อกแล้ว'
                            : 'ไม่อนุมัติ'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => open(doc)}>{approval ? 'พิจารณา' : 'ดูรายการ'}</Button>
                    {query.data?.canManage && doc.kind === 'issue' && doc.status === 'posted' && (
                      <Button
                        component={RouterLink}
                        href={`${user?.role === 'school_admin' ? paths.admin.inventory : paths.teacher.inventory}/returns/new?source=${doc.id}`}
                      >
                        รับคืนวัสดุ
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!query.isPending && !docs.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    ไม่มีรายการ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={docs.length}
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
      <Dialog
        open={Boolean(selected)}
        onClose={() => {
          if (!mutation.isPending) setSelected(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <Form methods={methods} onSubmit={methods.handleSubmit((v) => mutation.mutate(v))}>
          <DialogTitle>รายละเอียดใบพัสดุ</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2 }}>
            {selected && (
              <>
                <Typography>
                  {selected.recipient} · {selected.reference_number || 'ไม่มีเลขที่อ้างอิง'} ·{' '}
                  {selected.document_date || '—'}
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected.note}</Typography>
                {selected.source_purchase_id && (
                  <Alert
                    severity="info"
                    action={
                      <Button component={RouterLink} href={`${root}/purchases`}>
                        ดูรายการจัดซื้อ
                      </Button>
                    }
                  >
                    รับเข้าจากใบสั่งซื้อที่อนุมัติแล้ว
                  </Alert>
                )}
                {selected.source_request_id && (
                  <Alert severity="info">
                    รับเข้าจากใบขอเบิก OUT-
                    {String(
                      query.data?.documents.find((doc) => doc.id === selected.source_request_id)
                        ?.document_number ?? '—'
                    ).padStart(6, '0')}
                  </Alert>
                )}
                {selected.lines.map((line, index) => {
                  const item = query.data?.items.find((entry) => entry.id === line.item_id);
                  return (
                    <Typography key={line.item_id}>
                      {index + 1}. {item?.code} {item?.name || 'ไม่พบพัสดุ'} · {line.quantity}{' '}
                      {item?.unit} (คงเหลือ {item?.quantity ?? '—'})
                    </Typography>
                  );
                })}
                {selected.review_note && (
                  <Alert severity="info">ผลพิจารณา: {selected.review_note}</Alert>
                )}
                {selected.kind === 'issue' &&
                  selected.status === 'submitted' &&
                  query.data?.canApprove && (
                    <>
                      <Field.Switch
                        name="approve"
                        label="อนุมัติและตัดสต็อก (ปิดเพื่อไม่อนุมัติ)"
                      />
                      <Field.Text
                        name="note"
                        label="หมายเหตุ / เหตุผลไม่อนุมัติ"
                        multiline
                        minRows={3}
                      />
                      <Alert severity="info">ระบบจะตรวจยอดทุกบรรทัดอีกครั้งก่อนอนุมัติ</Alert>
                    </>
                  )}
                {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button disabled={mutation.isPending} onClick={() => setSelected(null)}>
              ปิด
            </Button>
            {selected?.kind === 'issue' &&
              selected.status === 'submitted' &&
              query.data?.canApprove && (
                <Button type="submit" variant="contained" loading={mutation.isPending}>
                  ยืนยันผลพิจารณา
                </Button>
              )}
          </DialogActions>
        </Form>
      </Dialog>
    </Container>
  );
}
