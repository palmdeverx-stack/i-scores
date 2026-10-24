'use client';

import type { DocumentReservationValues } from '../document-reservation-schema';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { getSchool } from 'src/sections/school/school-actions';

import { useAuthContext } from 'src/auth/hooks';

import { reserveDocumentNumber } from '../document-actions';
import { DocumentReservationSchema } from '../document-reservation-schema';

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function DocumentReservationDialog({ onClose, onSuccess }: Props) {
  const { user } = useAuthContext();
  const client = useQueryClient();
  const [id] = useState(() => crypto.randomUUID());
  const school = useQuery({
    queryKey: ['school', user?.school_id],
    queryFn: () => getSchool(user!.school_id!),
    enabled: Boolean(user?.school_id),
  });
  const methods = useForm<DocumentReservationValues>({
    resolver: zodResolver(DocumentReservationSchema),
    defaultValues: {
      requestedSequence: '',
      templateSlug: '',
      title: '',
      purpose: '',
      plannedDate: '',
    },
    mode: 'onBlur',
  });
  const requestedSequence = methods.watch('requestedSequence');
  const prefix = (school.data?.document_prefix ?? '').replace(/\/+$/, '');
  const formatNumber = (sequence: string | number) => `${prefix ? `${prefix}/` : ''}${sequence}`;
  const mutation = useMutation({
    mutationFn: (values: DocumentReservationValues) => reserveDocumentNumber({ ...values, id }),
    onSuccess: async (saved) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['my-documents'] }),
        client.invalidateQueries({ queryKey: ['school', user?.school_id] }),
      ]);
      toast.success(`จองเลข ${saved.document_number ?? ''} แล้ว`);
      onSuccess();
      onClose();
    },
  });
  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <DialogTitle>จองเลขเอกสารใหม่</DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Form
          methods={methods}
          onSubmit={methods.handleSubmit((values) => {
            if (!mutation.isPending) mutation.mutate(values);
          })}
        >
          <Box sx={{ pt: 1, display: 'grid', gap: 2.5 }}>
            <Alert severity="info">
              ระบบออกเลขจริงจากลำดับปัจจุบันของโรงเรียนเมื่อกดจอง
              เลขที่จองแล้วจะไม่ถูกนำไปใช้กับเอกสารฉบับอื่น แม้ยกเลิกการจอง
            </Alert>
            {school.data && (
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'background.neutral' }}>
                <Typography variant="body2" color="text.secondary">
                  เลขเอกสารปัจจุบัน: {formatNumber(school.data.document_sequence_current)}
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                  {requestedSequence
                    ? `เลขที่ต้องการจอง: ${formatNumber(requestedSequence)}`
                    : 'รันเลขถัดไปอัตโนมัติ โดยข้ามเลขที่จองไว้'}
                </Typography>
              </Box>
            )}
            {school.error && <Alert severity="warning">โหลดเลขปัจจุบันไม่สำเร็จ</Alert>}
            <Field.Text
              name="requestedSequence"
              label="เลขที่ต้องการจอง (หลัง /)"
              helperText="เว้นว่างเพื่อรันอัตโนมัติ เลขที่ระบุต้องมากกว่าเลขปัจจุบันและยังไม่ถูกใช้ ระบบจะข้ามเลขที่จองไว้"
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 12 } }}
            />
            <Field.Text
              name="title"
              label="เรื่อง / โครงการที่วางแผนจัดทำ"
              required
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Field.DatePicker
              name="plannedDate"
              label="วันที่วางแผนจัดทำ (ถ้ามี)"
              onChange={(value) => {
                methods.setValue('plannedDate', value ? value.format('YYYY-MM-DD') : '', {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'เป็นวันวางแผน ไม่ใช่วันที่ออกเลขจอง',
                },
              }}
            />
            <Field.Text
              name="purpose"
              label="รายละเอียดการจอง / หมายเหตุ"
              multiline
              minRows={3}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
            {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button color="inherit" disabled={mutation.isPending} onClick={onClose}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="contained" loading={mutation.isPending}>
                ยืนยันจองเลขเอกสาร
              </Button>
            </Box>
          </Box>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
