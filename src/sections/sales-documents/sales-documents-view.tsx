'use client';

import type { SalesDocumentSummary } from './sales-document-actions';
import type { SalesDocument, SalesDocumentKind } from './sales-document-schema';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
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

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import {
  RiEditLine,
  RiPrinterLine,
  RiMailSendLine,
  RiDeleteBinLine,
} from 'src/components/remix-icon';

import { SalesQuotationEmailDialog } from './sales-quotation-email-dialog';
import {
  listSalesDocuments,
  deleteSalesDocument,
  salesDocumentPrintUrl,
} from './sales-document-actions';
import {
  salesMoney,
  salesDocumentKind,
  canEditSalesDocument,
  SALES_DOCUMENT_LABELS,
} from './sales-document-schema';

const PAGE_SIZE = 25;
const dateFormatter = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'UTC' });

export function SalesDocumentsView({ category }: { category?: SalesDocumentKind }) {
  const [kindFilter, setKindFilter] = useState<SalesDocumentKind | ''>('');
  const [status, setStatus] = useState<SalesDocument['status'] | ''>('');
  const [page, setPage] = useState(0);
  const [emailQuotation, setEmailQuotation] = useState<SalesDocumentSummary | null>(null);
  const [deleting, setDeleting] = useState<SalesDocumentSummary | null>(null);
  const queryClient = useQueryClient();
  const kind = category ?? kindFilter;
  const title = category ? SALES_DOCUMENT_LABELS[category] : 'เอกสารการขาย';

  const list = useQuery({
    queryKey: ['master-sales-documents', page, kind, status],
    queryFn: ({ signal }) => listSalesDocuments(page, kind, status, undefined, signal),
    placeholderData: (previous, query) =>
      query?.queryKey[2] === kind && query.queryKey[3] === status ? previous : undefined,
  });
  const deletion = useMutation({
    mutationFn: deleteSalesDocument,
    onSuccess: ({ id }) => {
      queryClient.removeQueries({ queryKey: ['master-sales-document', id] });
      if (page > 0 && list.data?.documents.length === 1) setPage(page - 1);
      void queryClient.invalidateQueries({ queryKey: ['master-sales-documents'] });
      setDeleting(null);
    },
  });
  return (
    <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h3">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            จัดทำแบบร่าง ออกเลขเอกสาร และพิมพ์เอกสารสำหรับลูกค้า
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          variant="contained"
          href={paths.master.salesDocumentNew(kind || undefined)}
        >
          {category ? `สร้าง${title}` : 'สร้างเอกสาร'}
        </Button>
      </Box>

      {list.error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" onClick={() => list.refetch()}>
              ลองอีกครั้ง
            </Button>
          }
        >
          {list.error.message}
        </Alert>
      )}
      <Card variant="outlined">
        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {!category && (
            <TextField
              select
              size="small"
              label="ประเภทเอกสาร"
              value={kind}
              sx={{ width: { xs: 1, sm: 220 } }}
              onChange={(event) => {
                const value = event.target.value;
                setKindFilter(value ? salesDocumentKind.parse(value) : '');
                setPage(0);
              }}
            >
              <MenuItem value="">ทุกประเภท</MenuItem>
              {salesDocumentKind.options.map((option) => (
                <MenuItem key={option} value={option}>
                  {SALES_DOCUMENT_LABELS[option]}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            size="small"
            label="สถานะ"
            value={status}
            sx={{ width: { xs: 1, sm: 160 } }}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(0);
            }}
          >
            <MenuItem value="">ทุกสถานะ</MenuItem>
            <MenuItem value="draft">แบบร่าง</MenuItem>
            <MenuItem value="issued">ออกเอกสารแล้ว</MenuItem>
          </TextField>
        </Box>
        <TableContainer>
          <Table aria-label={`รายการ${title}`} aria-busy={list.isFetching} sx={{ minWidth: 740 }}>
            <TableHead>
              <TableRow>
                <TableCell>เอกสาร</TableCell>
                <TableCell>ลูกค้า</TableCell>
                <TableCell>วันที่เอกสาร</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">ยอดสุทธิ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.isPending && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    กำลังโหลดเอกสาร…
                  </TableCell>
                </TableRow>
              )}
              {!list.isPending && !list.error && !list.data?.documents.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    ไม่พบเอกสารในรายการนี้
                  </TableCell>
                </TableRow>
              )}
              {list.data?.documents.map((document) => (
                <TableRow key={document.id} hover>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{ minWidth: 200, overflowWrap: 'anywhere' }}
                  >
                    <Typography variant="subtitle2">{document.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {SALES_DOCUMENT_LABELS[document.kind]}
                      {document.document_number ? ` · ${document.document_number}` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{document.customer || '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {dateFormatter.format(new Date(document.date))}
                  </TableCell>
                  <TableCell>
                    <Label color={document.status === 'issued' ? 'success' : 'default'}>
                      {document.status === 'issued' ? 'ออกเอกสารแล้ว' : 'แบบร่าง'}
                    </Label>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {salesMoney.format(document.total_satang / 100)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {canEditSalesDocument(document) && (
                      <Tooltip title="แก้ไข">
                        <IconButton
                          size="small"
                          aria-label="แก้ไข"
                          component={RouterLink}
                          href={paths.master.salesDocumentEdit(document.id, category)}
                        >
                          <RiEditLine size={20} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="ดู / พิมพ์">
                      <IconButton
                        size="small"
                        aria-label="ดู / พิมพ์"
                        href={salesDocumentPrintUrl(document.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <RiPrinterLine size={20} />
                      </IconButton>
                    </Tooltip>
                    {document.kind === 'quotation' && document.status === 'issued' && (
                      <Tooltip title="ส่งอีเมล">
                        <IconButton
                          size="small"
                          aria-label="ส่งอีเมลให้ลูกค้า"
                          onClick={() => setEmailQuotation(document)}
                        >
                          <RiMailSendLine size={20} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {document.status === 'draft' && (
                      <Tooltip title="ลบแบบร่าง">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="ลบแบบร่าง"
                          onClick={() => {
                            deletion.reset();
                            setDeleting(document);
                          }}
                        >
                          <RiDeleteBinLine size={20} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {(list.data?.total ?? 0) > PAGE_SIZE && (
          <TablePagination
            component="div"
            count={list.data?.total ?? 0}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, value) => setPage(value)}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count} รายการ`}
            getItemAriaLabel={(type) => (type === 'next' ? 'หน้าถัดไป' : 'หน้าก่อนหน้า')}
          />
        )}
      </Card>
      {emailQuotation && (
        <SalesQuotationEmailDialog
          quotation={emailQuotation}
          onClose={() => setEmailQuotation(null)}
        />
      )}
      <Dialog
        open={Boolean(deleting)}
        onClose={() => !deletion.isPending && setDeleting(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>ลบแบบร่าง</DialogTitle>
        <DialogContent>
          {deletion.error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {deletion.error.message}
            </Alert>
          )}
          <Typography>ลบ “{deleting?.title}” ถาวรหรือไม่</Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={deletion.isPending} onClick={() => setDeleting(null)}>
            ยกเลิก
          </Button>
          <Button
            color="error"
            variant="contained"
            loading={deletion.isPending}
            onClick={() => deleting && deletion.mutate(deleting)}
          >
            ยืนยันลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
