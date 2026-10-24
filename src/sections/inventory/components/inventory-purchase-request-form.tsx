'use client';

import type { FieldPath } from 'react-hook-form';
import type { Inventory, InventoryPurchase } from '../types';
import type { PurchaseRequestValues } from '../inventory-purchase-schema';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { Form, Field } from 'src/components/hook-form';

import { InventoryFormSection } from './inventory-form-section';
import { createInventoryPurchase } from '../inventory-purchase-actions';
import { PurchaseDraftSchema, PurchaseRequestSchema } from '../inventory-purchase-schema';

export function InventoryPurchaseRequestForm({
  inventory,
  purchase,
  onSaved,
  onCancel,
}: {
  inventory: Inventory;
  purchase?: InventoryPurchase;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const client = useQueryClient();
  const [documentId] = useState(() => purchase?.id ?? crypto.randomUUID());
  const methods = useForm<PurchaseRequestValues>({
    resolver: zodResolver(
      PurchaseRequestSchema.superRefine((values, ctx) =>
        values.lines.forEach((line, index) => {
          if (!inventory.items.some((item) => item.id === line.item_id))
            ctx.addIssue({
              code: 'custom',
              path: ['lines', index, 'item_id'],
              message: 'กรุณาเลือกพัสดุของโรงเรียน',
            });
        })
      )
    ),
    defaultValues: {
      title: purchase?.title ?? '',
      purpose: purchase?.purpose ?? '',
      lines: purchase?.lines.length ? purchase.lines : [{ item_id: '', quantity: 1 }],
    },
    mode: 'onBlur',
  });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'lines' });
  const lines = useWatch({ control: methods.control, name: 'lines' });
  const mutation = useMutation({
    mutationFn: async ({ values, draft }: { values: PurchaseRequestValues; draft: boolean }) => {
      await createInventoryPurchase({ ...values, id: documentId }, draft);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['inventory-purchases'] }),
        client.invalidateQueries({ queryKey: ['inventory-purchase-detail'] }),
      ]);
      onSaved();
    },
  });
  const saveDraft = () => {
    methods.clearErrors();
    const values = methods.getValues();
    const result = PurchaseDraftSchema.safeParse({
      ...values,
      lines: values.lines.filter((line) => Boolean(line.item_id)),
    });
    if (!result.success) {
      for (const issue of result.error.issues)
        methods.setError(issue.path.join('.') as FieldPath<PurchaseRequestValues>, {
          message: issue.message,
        });
      return;
    }
    mutation.mutate({ values: result.data, draft: true });
  };
  return (
    <Form
      methods={methods}
      onSubmit={methods.handleSubmit((values) => {
        if (!mutation.isPending) mutation.mutate({ values, draft: false });
      })}
    >
      <Box sx={{ display: 'grid', gap: 3 }}>
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        <Card variant="outlined" sx={{ p: { xs: 2, sm: 4 }, display: 'grid', gap: 2.5 }}>
          <InventoryFormSection
            number="1"
            title="ใบขอจัดซื้อ"
            description="ระบุความจำเป็นและรายการที่ต้องการจัดซื้อ โดยยังไม่เปลี่ยนยอดสต็อก"
            icon="solar:clipboard-list-bold-duotone"
          />
          <Field.Text
            name="title"
            label="เรื่องขอจัดซื้อ"
            required
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <Field.Text
            name="purpose"
            label="เหตุผล / ความจำเป็น / วัตถุประสงค์"
            multiline
            minRows={3}
            required
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <Typography variant="subtitle1">รายการพัสดุ ({fields.length}/100)</Typography>
          {fields.map((field, index) => (
            <Box
              key={field.id}
              sx={{
                display: 'grid',
                gap: 1.5,
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) 140px 70px' },
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 2,
              }}
            >
              <Field.Select
                name={`lines.${index}.item_id`}
                label={`พัสดุรายการที่ ${index + 1}`}
                size="small"
                required
                disabled={mutation.isPending}
              >
                <MenuItem value="">เลือกพัสดุ</MenuItem>
                {inventory.items.map((item) => (
                  <MenuItem
                    key={item.id}
                    value={item.id}
                    disabled={lines.some(
                      (line, other) => other !== index && line.item_id === item.id
                    )}
                  >
                    {item.code} · {item.name} · {item.unit}
                  </MenuItem>
                ))}
              </Field.Select>
              <Field.Text
                name={`lines.${index}.quantity`}
                label="จำนวนที่ขอซื้อ"
                type="number"
                size="small"
                required
                disabled={mutation.isPending}
              />
              <Button
                color="error"
                disabled={fields.length === 1 || mutation.isPending}
                onClick={() => remove(index)}
              >
                นำออก
              </Button>
            </Box>
          ))}
          {(methods.formState.errors.lines?.root?.message ||
            methods.formState.errors.lines?.message) && (
            <Alert severity="error">
              {methods.formState.errors.lines.root?.message ||
                methods.formState.errors.lines.message}
            </Alert>
          )}
          <Button
            variant="outlined"
            disabled={fields.length >= 100 || mutation.isPending}
            onClick={() => append({ item_id: '', quantity: 1 })}
          >
            เพิ่มรายการ
          </Button>
          <Alert severity="info">
            บันทึกแบบร่างได้โดยระบุเรื่องก่อน แล้วค่อยเติมเหตุผลและรายการให้ครบก่อนส่งอนุมัติ
            หลังอนุมัติ ให้บันทึกผู้จำหน่าย เลขที่และวันที่ใบสั่งซื้อ พร้อมแนบไฟล์
            แล้วจึงรับของตามใบได้
          </Alert>
        </Card>
        <Card variant="outlined" sx={{ p: 2, position: 'sticky', bottom: 16, zIndex: 5 }}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button color="inherit" disabled={mutation.isPending} onClick={onCancel}>
              ยกเลิก
            </Button>
            <Button
              variant="outlined"
              disabled={mutation.isPending}
              loading={mutation.isPending && mutation.variables?.draft}
              onClick={saveDraft}
            >
              บันทึกแบบร่าง
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={mutation.isPending}
              loading={mutation.isPending && !mutation.variables?.draft}
            >
              ส่งขออนุมัติจัดซื้อ
            </Button>
          </Box>
        </Card>
      </Box>
    </Form>
  );
}
