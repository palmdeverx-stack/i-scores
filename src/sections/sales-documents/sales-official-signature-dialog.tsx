'use client';

import type { SalesSeller } from './sales-seller-actions';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Form } from 'src/components/hook-form';

import { salesSignatureInputSchema } from './sales-signature-schema';
import { SalesSellerSignatureField } from './sales-seller-signature-field';
import { salesPartyQueryKey, saveOfficialSalesSignature } from './sales-seller-actions';

export function SalesOfficialSignatureDialog({
  seller,
  onClose,
}: {
  seller: SalesSeller;
  onClose: () => void;
}) {
  const [reading, setReading] = useState(false);
  const queryClient = useQueryClient();
  const methods = useForm({
    resolver: zodResolver(salesSignatureInputSchema),
    defaultValues: { signatureImage: seller.signatureImage ?? '' },
  });
  const save = useMutation({
    mutationFn: ({ signatureImage }: { signatureImage: string }) =>
      saveOfficialSalesSignature(seller, signatureImage),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesPartyQueryKey('seller') });
      toast.success('บันทึกลายเซ็นแล้ว');
      onClose();
    },
  });
  const busy = reading || save.isPending;

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={() => !busy && onClose()}>
      <Form
        methods={methods}
        onSubmit={methods.handleSubmit((values) => {
          if (!busy) save.mutate(values);
        })}
      >
        <DialogTitle>แก้ไขลายเซ็นผู้ขาย</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
          <Typography>{seller.name}</Typography>
          {save.error && <Alert severity="error">{save.error.message}</Alert>}
          <SalesSellerSignatureField disabled={busy} onReadingChange={setReading} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" loading={save.isPending} disabled={reading}>
            บันทึกลายเซ็น
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}
