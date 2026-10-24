'use client';

import type { Inventory, InventoryAsset } from '../types';
import type { InventoryAssetActivateValues } from '../inventory-asset-schema';

import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { Form, Field } from 'src/components/hook-form';

import { activateInventoryAsset } from '../inventory-asset-actions';
import { InventoryAssetActivateSchema } from '../inventory-asset-schema';

export function InventoryAssetActivateForm({
  asset,
  inventory,
  onSaved,
  onCancel,
}: {
  asset: InventoryAsset;
  inventory: Inventory;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const methods = useForm<InventoryAssetActivateValues>({
    resolver: zodResolver(InventoryAssetActivateSchema),
    defaultValues: { custodian: '', location: '' },
    mode: 'onBlur',
  });
  const mutation = useMutation({
    mutationFn: (values: InventoryAssetActivateValues) =>
      activateInventoryAsset({ ...values, id: asset.id }),
    onSuccess: onSaved,
  });
  return (
    <Form methods={methods} onSubmit={methods.handleSubmit((values) => mutation.mutate(values))}>
      <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <Typography variant="subtitle1">เลขทะเบียน {asset.asset_code}</Typography>
        <Field.Text
          name="custodian"
          label="ผู้รับผิดชอบ / ผู้ใช้งาน"
          required
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <Field.Select name="location" label="สถานที่ใช้งาน" required>
          {inventory.locations
            .filter((location) => location.is_active)
            .map((location) => (
              <MenuItem key={location.id} value={location.name}>
                {location.name}
              </MenuItem>
            ))}
        </Field.Select>
        <Alert severity="info">
          ยืนยันนำครุภัณฑ์ที่ขึ้นทะเบียนแล้วไปใช้งาน พร้อมบันทึกผู้รับผิดชอบและสถานที่
        </Alert>
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button disabled={mutation.isPending} color="inherit" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            ยืนยันนำไปใช้งาน
          </Button>
        </Box>
      </Box>
    </Form>
  );
}
