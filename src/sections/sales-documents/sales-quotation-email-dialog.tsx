'use client';

import type { SalesDocument } from './sales-document-schema';
import type { SalesDocumentSummary } from './sales-document-actions';
import type { SalesQuotationEmailInput } from './sales-quotation-email-schema';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { getSalesDocument, sendSalesQuotationEmail } from './sales-document-actions';
import {
  salesQuotationEmailSchema,
  salesQuotationAttachmentName,
} from './sales-quotation-email-schema';

function SalesQuotationEmailForm({
  record,
  onClose,
}: {
  record: SalesDocument;
  onClose: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(true);
  const { content, document_number: number } = record;
  const methods = useForm<SalesQuotationEmailInput>({
    resolver: zodResolver(salesQuotationEmailSchema),
    defaultValues: {
      recipient: content.customer.documentEmail ?? '',
      subject: `ใบเสนอราคา ${number}`,
      message: `เรียน ${content.customer.name}\n\n${content.seller.name} ขอส่งใบเสนอราคาเรื่อง ${content.title} ตามไฟล์แนบ`,
    },
  });
  const send = useMutation({
    mutationFn: (values: SalesQuotationEmailInput) =>
      sendSalesQuotationEmail(record.id, record.updated_at, values),
    onSuccess: () => {
      toast.success('ส่งใบเสนอราคาทางอีเมลแล้ว');
      onClose();
    },
  });

  return (
    <Dialog
      open
      fullWidth
      maxWidth={previewOpen ? 'lg' : 'sm'}
      onClose={() => !send.isPending && onClose()}
    >
      <Form
        methods={methods}
        onSubmit={methods.handleSubmit((values) => {
          if (!send.isPending) send.mutate(values);
        })}
      >
        <DialogTitle>ส่งใบเสนอราคาทางอีเมล</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: previewOpen
                ? { xs: 'minmax(0,1fr)', md: 'minmax(0,1fr) minmax(0,1.5fr)' }
                : 'minmax(0,1fr)',
            }}
          >
            <Stack spacing={2}>
              {send.error && <Alert severity="error">{send.error.message}</Alert>}
              <Field.Text
                name="recipient"
                label="อีเมลผู้รับ"
                type="email"
                required
                disabled={send.isPending}
              />
              <Field.Text name="subject" label="หัวข้ออีเมล" required disabled={send.isPending} />
              <Field.Text
                name="message"
                label="รายละเอียดอีเมล"
                multiline
                minRows={5}
                disabled={send.isPending}
              />
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                <Typography variant="subtitle2">
                  {salesQuotationAttachmentName(number ?? '')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A4 แนวตั้ง · 210 × 297 มม.
                </Typography>
                <Button
                  type="button"
                  size="small"
                  aria-expanded={previewOpen}
                  aria-controls={previewOpen ? 'quotation-email-attachment' : undefined}
                  onClick={() => setPreviewOpen((open) => !open)}
                >
                  {previewOpen ? 'ซ่อนเอกสาร' : 'ดูเอกสารฉบับเต็มที่จะส่ง'}
                </Button>
              </Box>
            </Stack>
            {previewOpen && (
              <Box
                id="quotation-email-attachment"
                component="iframe"
                title="ใบเสนอราคาฉบับเต็มที่จะแนบ"
                src={`/api/master/sales-documents/send-email?${new URLSearchParams({
                  id: record.id,
                  revision: record.updated_at,
                })}`}
                sx={{
                  width: 1,
                  height: { xs: 480, md: 'min(65vh, 720px)' },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={send.isPending} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" loading={send.isPending}>
            ยืนยันส่งอีเมล
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

export function SalesQuotationEmailDialog({
  quotation,
  onClose,
}: {
  quotation: SalesDocumentSummary;
  onClose: () => void;
}) {
  const document = useQuery({
    queryKey: ['master-sales-document', quotation.id],
    queryFn: ({ signal }) => getSalesDocument(quotation.id, signal),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  const record = document.data;

  if (
    record?.status === 'issued' &&
    record.document_number &&
    !document.isFetching &&
    !document.error
  ) {
    return <SalesQuotationEmailForm record={record} onClose={onClose} />;
  }

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose}>
      <DialogTitle>ส่งใบเสนอราคาทางอีเมล</DialogTitle>
      <DialogContent dividers>
        {document.isFetching ? (
          <Typography color="text.secondary">กำลังโหลดใบเสนอราคา…</Typography>
        ) : (
          <Alert severity="error">
            {document.error?.message ?? 'กรุณาออกเลขใบเสนอราคาก่อนส่ง'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
      </DialogActions>
    </Dialog>
  );
}
