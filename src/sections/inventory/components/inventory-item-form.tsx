'use client';

import type { Inventory, InventoryItem } from '../types';
import type { InventoryItemFormValues } from '../inventory-schema';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { Upload } from 'src/components/upload';
import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import { InventoryItemSchema } from '../inventory-schema';
import { InventoryFormSection } from './inventory-form-section';
import { saveInventory, saveInventoryImage } from '../inventory-actions';

const emptyItem = {
  item_type: 'material' as const,
  material_subtype: 'consumable' as const,
  description: '',
  brand: '',
  model: '',
  specifications: '',
  barcode: '',
  reference_price: 0,
  supplier: '',
  notes: '',
  code: '',
  name: '',
  category: '',
  unit: '',
  location: '',
  minimum_stock: 0,
  maximum_stock: 0,
};

export function InventoryItemForm({
  inventory,
  item,
  masterRoot,
  dialog = false,
  onCancel,
  onSaved,
}: {
  inventory: Inventory;
  item?: InventoryItem;
  masterRoot: string;
  dialog?: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [savedId, setSavedId] = useState(item?.id);
  const [removeImage, setRemoveImage] = useState(false);
  const schema = InventoryItemSchema.superRefine((values, context) => {
    for (const kind of ['category', 'unit', 'location'] as const) {
      const rows =
        kind === 'category'
          ? inventory.categories
          : kind === 'unit'
            ? inventory.units
            : inventory.locations;
      if (
        values[kind] &&
        !rows.some(
          (row) => row.name === values[kind] && (row.is_active || item?.[kind] === row.name)
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: [kind],
          message:
            kind === 'category'
              ? 'กรุณาเลือกหมวดหมู่ที่เปิดใช้งาน'
              : kind === 'unit'
                ? 'กรุณาเลือกหน่วยนับที่เปิดใช้งาน'
                : 'กรุณาเลือกที่จัดเก็บที่เปิดใช้งาน',
        });
      }
    }
  });
  const methods = useForm<InventoryItemFormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      ...emptyItem,
      ...item,
      location: item?.location ?? '',
      image: null,
      unit:
        item?.unit ??
        inventory.units.find((row) => row.name === 'ชิ้น' && row.is_active)?.name ??
        '',
    },
  });
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = methods;
  const itemType = useWatch({ control, name: 'item_type' });
  const imageFile = useWatch({ control, name: 'image' });
  const items = inventory.items;
  const mutation = useMutation({
    mutationFn: async ({ image, ...values }: InventoryItemFormValues) => {
      const saved = await saveInventory({ ...values, id: savedId, action: 'item' });
      setSavedId(saved.id);
      if (image || removeImage) {
        try {
          await saveInventoryImage(saved.id, image);
        } catch (error) {
          await queryClient.invalidateQueries({ queryKey: ['school-inventory'] });
          throw new Error(
            `บันทึกข้อมูลพัสดุแล้ว แต่${error instanceof Error ? error.message : 'บันทึกรูปไม่สำเร็จ'} กรุณาลองบันทึกอีกครั้ง`
          );
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['school-inventory'] });
      onSaved();
    },
  });
  const close = () => {
    if (!mutation.isPending) onCancel();
  };
  return (
    <Form methods={methods} onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: !dialog ? 0 : 3 }}>
        {dialog && <Typography variant="h5">แก้ไขพัสดุ</Typography>}
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
              <InventoryFormSection
                number="1"
                title="ข้อมูลพื้นฐานพัสดุ"
                description="ระบุชื่อ หมวดหมู่ และหน่วยนับ ระบบจะสร้างรหัสตามหมวดหมู่เมื่อบันทึก"
                icon="solar:box-bold-duotone"
              />
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <Field.Select
                  name="item_type"
                  label="ประเภทพัสดุ"
                  required
                  onChange={(event) => {
                    setValue('item_type', event.target.value as 'material' | 'equipment', {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue(
                      'material_subtype',
                      event.target.value === 'equipment' ? null : 'consumable',
                      { shouldDirty: true, shouldValidate: true }
                    );
                  }}
                >
                  <MenuItem value="material">วัสดุ</MenuItem>
                  <MenuItem value="equipment">ครุภัณฑ์</MenuItem>
                </Field.Select>
                {itemType === 'material' ? (
                  <Field.Select name="material_subtype" label="ชนิดวัสดุ" required>
                    <MenuItem value="consumable">วัสดุสิ้นเปลือง</MenuItem>
                  </Field.Select>
                ) : (
                  <Alert severity="info">
                    ครุภัณฑ์ต้องรับเข้าและขึ้นทะเบียนรายชิ้นก่อนใช้งาน ไม่เบิกผ่านใบวัสดุสิ้นเปลือง
                  </Alert>
                )}
                {(['code', 'name'] as const).map((field) => (
                  <Field.Text
                    key={field}
                    name={field}
                    label={
                      {
                        code: 'รหัสพัสดุ',
                        name: 'ชื่อพัสดุ',
                        location: 'ที่จัดเก็บ',
                      }[field]
                    }
                    required={field === 'name'}
                    placeholder={field === 'code' ? 'ระบบสร้างอัตโนมัติเมื่อบันทึก' : undefined}
                    helperText={
                      field === 'code'
                        ? 'รันเลขแยกตามหมวดหมู่และโรงเรียน รหัสเดิมจะคงไว้เมื่อแก้ไข'
                        : undefined
                    }
                    slotProps={{
                      htmlInput: {
                        maxLength: { code: 60, name: 200, location: 200 }[field],
                        readOnly: field === 'code',
                      },
                    }}
                  />
                ))}
                {(['category', 'unit', 'location'] as const).map((kind) => (
                  <Field.Select
                    key={kind}
                    name={kind}
                    required={kind !== 'location'}
                    label={
                      kind === 'category' ? 'หมวดหมู่' : kind === 'unit' ? 'หน่วยนับ' : 'ที่จัดเก็บ'
                    }
                  >
                    {kind === 'location' && <MenuItem value="">ยังไม่ระบุ</MenuItem>}
                    {(kind === 'category'
                      ? inventory.categories
                      : kind === 'unit'
                        ? inventory.units
                        : inventory.locations
                    )
                      ?.filter((row) => row.is_active || row.name === item?.[kind])
                      .map((row) => (
                        <MenuItem key={row.id} value={row.name}>
                          {row.name}
                        </MenuItem>
                      ))}
                  </Field.Select>
                ))}
              </Box>
            </Card>
            <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
              <InventoryFormSection
                number="2"
                title="รายละเอียดและคุณลักษณะ"
                description="เพิ่มข้อมูลที่ช่วยระบุและเลือกใช้งานพัสดุได้ถูกต้อง"
                icon="solar:document-text-bold-duotone"
              />
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                {(['description', 'brand', 'model', 'specifications', 'barcode'] as const).map(
                  (field) => (
                    <Field.Text
                      key={field}
                      name={field}
                      sx={{
                        gridColumn:
                          field === 'description' || field === 'specifications'
                            ? '1 / -1'
                            : undefined,
                      }}
                      label={
                        {
                          description: 'รายละเอียดพัสดุ',
                          brand: 'ยี่ห้อ',
                          model: 'รุ่น',
                          specifications: 'คุณลักษณะ / ขนาด / สี / วัสดุ',
                          barcode: 'บาร์โค้ด / รหัสอ้างอิง',
                        }[field]
                      }
                      multiline={field === 'description' || field === 'specifications'}
                      minRows={
                        field === 'description' || field === 'specifications' ? 3 : undefined
                      }
                      slotProps={{
                        htmlInput: {
                          maxLength:
                            field === 'description' || field === 'specifications' ? 4000 : 100,
                        },
                      }}
                    />
                  )
                )}
              </Box>
            </Card>
            <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
              <InventoryFormSection
                number="3"
                title="ข้อมูลจัดหาและการจัดเก็บ"
                description="กำหนดราคาอ้างอิง แหล่งจัดหา และเกณฑ์แจ้งเตือนคงเหลือ"
                icon="solar:clipboard-list-bold-duotone"
              />
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <Field.Text
                  label="ราคาอ้างอิงต่อหน่วย (บาท)"
                  helperText="ข้อมูลอ้างอิง ไม่ใช่มูลค่ารับเข้าหรือบัญชีต้นทุน"
                  type="number"
                  required
                  name="reference_price"
                  slotProps={{ htmlInput: { min: 0, max: 999999999999.99, step: 0.01 } }}
                />
                <Field.Text
                  label="ผู้จำหน่าย / แหล่งจัดหา"
                  name="supplier"
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
                <Field.Text
                  label="หมายเหตุ / การดูแลรักษา"
                  sx={{ gridColumn: '1 / -1' }}
                  multiline
                  minRows={3}
                  name="notes"
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
                <Field.Text
                  label="MIN Stock"
                  helperText="แจ้งใกล้หมดเมื่อยอดคงเหลือไม่เกิน MIN"
                  type="number"
                  name="minimum_stock"
                  required
                  slotProps={{ htmlInput: { min: 0, max: 1000000000, step: 1 } }}
                />
                <Field.Text
                  name="maximum_stock"
                  label="MAX Stock"
                  type="number"
                  required
                  helperText="ระดับที่ต้องการเติมถึง · 0 = ยังไม่กำหนด MAX"
                  slotProps={{ htmlInput: { min: 0, max: 1000000000, step: 1 } }}
                />
                <Typography variant="caption" color="text.secondary">
                  ยอดคงเหลือเปลี่ยนผ่านรายการรับเข้า–เบิกจ่าย เพื่อเก็บประวัติทุกครั้ง
                </Typography>
              </Box>
            </Card>
          </Box>
          <Card variant="outlined" sx={{ p: 3, top: 88, position: { lg: 'sticky' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1.5,
                  bgcolor: 'primary.lighter',
                  color: 'primary.main',
                }}
              >
                <RemixIcon icon="solar:gallery-wide-bold-duotone" width={23} />
              </Box>
              <Box>
                <Typography variant="subtitle1">รูปภาพพัสดุ</Typography>
                <Typography variant="caption" color="text.secondary">
                  รูปประกอบสำหรับทะเบียนพัสดุ
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ใช้รูปที่เห็นลักษณะพัสดุชัดเจน เพื่อช่วยค้นหาและตรวจรับ
            </Typography>
            <Upload
              value={
                removeImage
                  ? null
                  : imageFile ||
                    (savedId && items.find((entry) => entry.id === savedId)?.image_path
                      ? `/api/inventory/${savedId}/image?v=${encodeURIComponent(items.find((entry) => entry.id === savedId)?.image_path ?? '')}`
                      : null)
              }
              accept={{
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
                'image/webp': ['.webp'],
              }}
              maxSize={5242880}
              disabled={mutation.isPending}
              onDrop={(files) => {
                const file = files[0];
                if (file) {
                  setValue('image', file, { shouldDirty: true, shouldValidate: true });
                  setRemoveImage(false);
                }
              }}
              onDelete={() => {
                setValue('image', null, { shouldDirty: true, shouldValidate: true });
                setRemoveImage(true);
              }}
              error={Boolean(errors.image)}
              helperText={errors.image?.message ?? 'PNG, JPEG หรือ WEBP ขนาดไม่เกิน 5 MB'}
              sx={{ height: { xs: 180, sm: 220 } }}
            />
            <Alert severity="info" variant="outlined" sx={{ mt: 2.5 }}>
              ช่องที่มีเครื่องหมาย * เป็นข้อมูลที่จำเป็น
            </Alert>
            <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
              รายการใหม่เริ่มต้นที่ยอดศูนย์ บันทึกรับเข้าตามจำนวนจริงภายหลัง
            </Alert>
          </Card>
        </Box>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            bottom: 16,
            zIndex: 5,
            position: 'sticky',
            boxShadow: (theme) => theme.vars.customShadows.z8,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: { sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              ตรวจสอบข้อมูลให้ครบก่อนบันทึกพัสดุ
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="large" color="inherit" disabled={mutation.isPending} onClick={close}>
                ยกเลิก
              </Button>
              <Button
                size="large"
                type="submit"
                variant="contained"
                loading={mutation.isPending}
                sx={{ minWidth: 170 }}
              >
                บันทึก
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>
    </Form>
  );
}
