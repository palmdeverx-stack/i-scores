'use client';

import type { Inventory } from '../types';
import type { InventoryAssetRegisterValues } from '../inventory-asset-schema';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import { InventoryFormSection } from './inventory-form-section';
import { InventoryAssetRegisterSchema } from '../inventory-asset-schema';
import { registerInventoryAsset, loadInventoryAssetReceipts } from '../inventory-asset-actions';

export function InventoryAssetRegisterForm({
  inventory,
  onSaved,
  onCancel,
}: {
  inventory: Inventory;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuthContext();
  const [id] = useState(() => crypto.randomUUID());
  const [today] = useState(() => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10));
  const methods = useForm<InventoryAssetRegisterValues>({
    resolver: zodResolver(InventoryAssetRegisterSchema),
    defaultValues: {
      item_id: '',
      receipt_movement_id: '',
      asset_code: '',
      serial_number: '',
      acquisition_date: today,
      acquisition_cost: 0,
      notes: '',
    },
    mode: 'onBlur',
  });
  const itemId = useWatch({ control: methods.control, name: 'item_id' });
  const receiptId = useWatch({ control: methods.control, name: 'receipt_movement_id' });
  const selectedItem = inventory.items.find((item) => item.id === itemId);
  const receipts = useQuery({
    queryKey: ['inventory-asset-receipts', user?.school_id, user?.id, itemId],
    queryFn: () => loadInventoryAssetReceipts(itemId),
    enabled: Boolean(itemId),
  });
  const mutation = useMutation({
    mutationFn: (values: InventoryAssetRegisterValues) => registerInventoryAsset({ ...values, id }),
    onSuccess: onSaved,
  });
  const selectedReceipt = receipts.data?.find((receipt) => receipt.movement_id === receiptId);
  return (
    <Form
      methods={methods}
      onSubmit={methods.handleSubmit((values) => {
        if (!mutation.isPending) mutation.mutate(values);
      })}
    >
      <Box sx={{ display: 'grid', gap: 3 }}>
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 340px' },
          }}
        >
          <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
            <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
              <InventoryFormSection
                number="1"
                title="ครุภัณฑ์และรายการรับเข้า"
                description="เลือกครุภัณฑ์และใบรับเข้าที่จะนำมาขึ้นทะเบียนรายชิ้น"
                icon="solar:box-bold-duotone"
              />
              <Box sx={{ mt: 3, display: 'grid', gap: 2.5 }}>
                <Field.Select
                  name="item_id"
                  label="ครุภัณฑ์"
                  required
                  disabled={mutation.isPending}
                  onChange={(event) => {
                    methods.setValue('item_id', event.target.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    methods.setValue('receipt_movement_id', '');
                    methods.setValue(
                      'acquisition_cost',
                      Number(
                        inventory.items.find((item) => item.id === event.target.value)
                          ?.reference_price ?? 0
                      )
                    );
                  }}
                >
                  <MenuItem value="">เลือกครุภัณฑ์</MenuItem>
                  {inventory.items
                    .filter((item) => item.item_type === 'equipment')
                    .map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </MenuItem>
                    ))}
                </Field.Select>
                <Field.Select
                  name="receipt_movement_id"
                  label="รายการรับเข้าต้นทาง"
                  required
                  disabled={!itemId || receipts.isPending}
                >
                  <MenuItem value="">เลือกใบรับเข้า</MenuItem>
                  {(receipts.data ?? [])
                    .filter((row) => row.quantity > row.registered_count)
                    .map((row) => (
                      <MenuItem key={row.movement_id} value={row.movement_id}>
                        {new Date(row.received_at).toLocaleDateString('th-TH', {
                          timeZone: 'Asia/Bangkok',
                        })}{' '}
                        · รับ {row.quantity} · ขึ้นทะเบียนได้อีก{' '}
                        {row.quantity - row.registered_count} ชิ้น
                      </MenuItem>
                    ))}
                </Field.Select>
                {receipts.error && <Alert severity="error">{receipts.error.message}</Alert>}
                {itemId &&
                  receipts.data &&
                  !receipts.data.some((row) => row.quantity > row.registered_count) && (
                    <Alert severity="warning">
                      ไม่มีจำนวนค้างขึ้นทะเบียน กรุณาตรวจสอบรายการรับเข้า
                    </Alert>
                  )}
              </Box>
            </Card>
            <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
              <InventoryFormSection
                number="2"
                title="ข้อมูลทะเบียนรายชิ้น"
                description="ระบุเลขทะเบียนและหมายเลขเครื่องเพื่อใช้ตรวจสอบครุภัณฑ์แต่ละชิ้น"
                icon="solar:clipboard-list-bold-duotone"
              />
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
                }}
              >
                <Field.Text
                  name="asset_code"
                  label="เลขทะเบียนครุภัณฑ์รายชิ้น"
                  required
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                />
                <Field.Text
                  name="serial_number"
                  label="หมายเลขเครื่อง / Serial number"
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
              </Box>
            </Card>
            <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
              <InventoryFormSection
                number="3"
                title="การได้มาและมูลค่า"
                description="ตรวจสอบวันที่และมูลค่าต่อชิ้นให้ตรงกับเอกสารรับเข้า"
                icon="solar:document-text-bold-duotone"
              />
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
                }}
              >
                <Field.Text
                  name="acquisition_date"
                  label="วันที่ได้มา"
                  type="date"
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Field.Text
                  name="acquisition_cost"
                  label="มูลค่าต่อชิ้น (บาท)"
                  helperText="เริ่มจากราคาอ้างอิง โปรดตรวจสอบกับเอกสารรับเข้า"
                  type="number"
                  required
                />
                <Field.Text
                  name="notes"
                  label="หมายเหตุ"
                  multiline
                  minRows={3}
                  sx={{ gridColumn: '1 / -1' }}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
              </Box>
            </Card>
          </Box>
          <Card
            variant="outlined"
            sx={{ p: 3, position: { lg: 'sticky' }, top: 88, display: 'grid', gap: 2 }}
          >
            <Typography variant="h6">สรุปการขึ้นทะเบียน</Typography>
            {selectedItem ? (
              <>
                {selectedItem.image_path && (
                  <Box
                    component="img"
                    src={`/api/inventory/${selectedItem.id}/image?v=${encodeURIComponent(selectedItem.image_path)}`}
                    alt={selectedItem.name}
                    sx={{ width: 1, height: 180, objectFit: 'contain', borderRadius: 1.5 }}
                  />
                )}
                <Box>
                  <Typography variant="subtitle1">{selectedItem.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedItem.code} · {selectedItem.category}
                  </Typography>
                </Box>
                {selectedReceipt && (
                  <Box>
                    <Typography variant="body2">
                      รับเข้าทั้งหมด {selectedReceipt.quantity} ชิ้น
                    </Typography>
                    <Typography variant="body2">
                      ขึ้นทะเบียนแล้ว {selectedReceipt.registered_count} ชิ้น
                    </Typography>
                    <Typography variant="subtitle2" color="primary.main">
                      ขึ้นทะเบียนได้อีก{' '}
                      {selectedReceipt.quantity - selectedReceipt.registered_count} ชิ้น
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                เลือกครุภัณฑ์เพื่อดูข้อมูลต้นทาง
              </Typography>
            )}
            <Alert severity="info" variant="outlined">
              1 ทะเบียนต่อ 1 ชิ้น หลังขึ้นทะเบียนให้กำหนดผู้รับผิดชอบและสถานที่ก่อนนำไปใช้งาน
            </Alert>
          </Card>
        </Box>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            position: 'sticky',
            bottom: 16,
            zIndex: 5,
            boxShadow: (theme) => theme.vars.customShadows.z8,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
            }}
          >
            <Typography variant="body2" color="text.secondary">
              ตรวจสอบเลขทะเบียนและรายการรับเข้าก่อนบันทึก
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="large" disabled={mutation.isPending} color="inherit" onClick={onCancel}>
                ยกเลิก
              </Button>
              <Button
                size="large"
                type="submit"
                variant="contained"
                loading={mutation.isPending}
                disabled={receipts.isPending || Boolean(receipts.error)}
                sx={{ minWidth: 170 }}
              >
                บันทึกทะเบียน
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>
    </Form>
  );
}
