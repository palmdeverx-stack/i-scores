'use client';

import type { InventoryPurchase } from '../types';
import type { PurchaseReviewValues } from '../inventory-purchase-schema';

import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Form, Field } from 'src/components/hook-form';

import { PurchaseOrderSchema, PurchaseReviewSchema } from '../inventory-purchase-schema';
import { orderInventoryPurchase, reviewInventoryPurchase } from '../inventory-purchase-actions';

export function PurchaseReviewForm({
  purchase,
  onSaved,
}: {
  purchase: InventoryPurchase;
  onSaved: () => void;
}) {
  const methods = useForm<PurchaseReviewValues>({
    resolver: zodResolver(PurchaseReviewSchema),
    defaultValues: { approve: true, note: '' },
  });
  const approve = useWatch({ control: methods.control, name: 'approve' });
  const mutation = useMutation({
    mutationFn: (values: PurchaseReviewValues) =>
      reviewInventoryPurchase({ ...values, id: purchase.id }),
    onSuccess: onSaved,
  });
  return (
    <Form methods={methods} onSubmit={methods.handleSubmit((v) => mutation.mutate(v))}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {!approve && <Alert severity="warning">กรุณาระบุเหตุผลก่อนยืนยันปฏิเสธใบขอจัดซื้อ</Alert>}
        <Field.Text
          name="note"
          label={approve ? 'หมายเหตุการพิจารณา (ถ้ามี)' : 'เหตุผลในการปฏิเสธ'}
          required={!approve}
          multiline
          minRows={3}
          disabled={mutation.isPending}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        {approve ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              type="button"
              color="error"
              variant="outlined"
              disabled={mutation.isPending}
              onClick={() => {
                methods.setValue('approve', false);
                methods.clearErrors();
                methods.setFocus('note');
              }}
            >
              ปฏิเสธ
            </Button>
            <Button type="submit" color="success" variant="contained" loading={mutation.isPending}>
              อนุมัติจัดซื้อ
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              type="button"
              color="inherit"
              disabled={mutation.isPending}
              onClick={() => {
                methods.setValue('approve', true);
                methods.clearErrors();
              }}
            >
              ยกเลิก
            </Button>
            <Button type="submit" color="error" variant="contained" loading={mutation.isPending}>
              ยืนยันปฏิเสธ
            </Button>
          </Box>
        )}
      </Box>
    </Form>
  );
}
export function PurchaseOrderForm({
  purchase,
  onSaved,
}: {
  purchase: InventoryPurchase;
  onSaved: () => void;
}) {
  const schema = PurchaseOrderSchema.extend({
    attachment: z
      .custom<File>(
        (value) => typeof File !== 'undefined' && value instanceof File,
        'กรุณาเลือกไฟล์'
      )
      .nullable()
      .refine(
        (file) =>
          !file ||
          (['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
            file.size > 0 &&
            file.size <= 10485760),
        'รองรับ PDF/JPG/PNG/WebP ไม่เกิน 10 MB'
      ),
  }).refine((v) => v.attachment || purchase.attachment_path, {
    path: ['attachment'],
    message: 'กรุณาแนบใบสั่งซื้อก่อนบันทึก',
  });
  type Values = z.infer<typeof schema>;
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier: purchase.supplier,
      order_number: purchase.order_number,
      order_date: purchase.order_date ?? '',
      attachment: null,
    },
  });
  const file = useWatch({ control: methods.control, name: 'attachment' });
  const mutation = useMutation({
    mutationFn: ({ attachment, ...values }: Values) =>
      orderInventoryPurchase({ ...values, id: purchase.id }, attachment),
    onSuccess: onSaved,
  });
  return (
    <Form methods={methods} onSubmit={methods.handleSubmit((v) => mutation.mutate(v))}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Typography variant="h6">บันทึกใบสั่งซื้อ</Typography>
        <Field.Text name="supplier" label="ผู้จำหน่าย / ผู้รับจ้าง" required />
        <Field.Text name="order_number" label="เลขที่ใบสั่งซื้อ" required />
        <Field.Text
          name="order_date"
          label="วันที่ใบสั่งซื้อ"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          required
        />
        <Button component="label" variant="outlined" disabled={mutation.isPending}>
          เลือกไฟล์ใบสั่งซื้อ
          <input
            hidden
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              e.target.value = '';
              if (selected) methods.setValue('attachment', selected, { shouldValidate: true });
            }}
          />
        </Button>
        <Typography variant="caption">
          {file?.name ??
            (purchase.attachment_path ? 'มีไฟล์แนบเดิมแล้ว' : 'PDF/JPG/PNG/WebP · ไม่เกิน 10 MB')}
        </Typography>
        {methods.formState.errors.attachment && (
          <Alert severity="error">{methods.formState.errors.attachment.message}</Alert>
        )}
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        <Alert severity="info">
          หลังบันทึกใบสั่งซื้อ จะรับของได้หลายครั้งจนกว่าจะครบจำนวนที่อนุมัติ
        </Alert>
        <Button type="submit" variant="contained" loading={mutation.isPending}>
          บันทึกใบสั่งซื้อและเตรียมรับเข้า
        </Button>
      </Box>
    </Form>
  );
}
