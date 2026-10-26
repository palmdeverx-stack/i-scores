'use client';

import type { InventoryReturnValues } from '../inventory-return-schema';

import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import { loadInventory } from '../inventory-actions';
import { loadInventoryAssets } from '../inventory-asset-actions';
import { InventoryReturnSchema } from '../inventory-return-schema';
import {
  saveInventoryReturn,
  loadInventoryReturns,
  loadInventoryReturnSource,
} from '../inventory-return-actions';

const kindOptions = [
  { id: 'material', name: 'คืนวัสดุเหลือใช้' },
  { id: 'equipment', name: 'คืนครุภัณฑ์รายชิ้น' },
];
const conditions = [
  { id: 'good', name: 'ใช้งานได้ — พร้อมนำไปใช้งานอีกครั้ง' },
  { id: 'damaged', name: 'ชำรุด — พักรอตรวจสอบ/ซ่อม' },
];
export function InventoryReturnForm({
  initialKind = 'material',
  initialSource = '',
  initialAsset = '',
  onCancel,
  onSaved,
}: {
  initialKind?: 'material' | 'equipment';
  initialSource?: string;
  initialAsset?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthContext();
  const client = useQueryClient();
  const retry = useRef<{ payload: string; id: string } | null>(null);
  const inventory = useQuery({
    queryKey: ['school-inventory', user?.school_id, user?.id],
    queryFn: loadInventory,
  });
  const assets = useQuery({
    queryKey: ['inventory-assets', user?.school_id, user?.id],
    queryFn: loadInventoryAssets,
  });
  const returns = useQuery({
    queryKey: ['inventory-returns', user?.school_id, user?.id],
    queryFn: loadInventoryReturns,
  });
  const [defaultValues] = useState(() => returnDefaults(initialKind, initialSource, initialAsset));
  const methods = useForm<InventoryReturnValues>({
    resolver: zodResolver(InventoryReturnSchema),
    mode: 'onBlur',
    defaultValues,
  });
  const { control, setValue, getValues } = methods;
  const kind = useWatch({ control, name: 'kind' });
  const sourceId = useWatch({ control, name: 'source_document_id' });
  const lines = useWatch({ control, name: 'lines' }) ?? [];
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lines' });
  const source = useQuery({
    queryKey: ['inventory-return-source', user?.school_id, sourceId],
    queryFn: () => loadInventoryReturnSource(sourceId!),
    enabled: kind === 'material' && Boolean(sourceId),
  });
  useEffect(() => {
    if (kind !== 'material' || !source.data || source.data.source.id !== sourceId) return;
    replace(source.data.lines.filter((line) => line.quantity > 0));
    if (!getValues('returned_by')) setValue('returned_by', source.data.source.recipient);
  }, [kind, source.data, sourceId, replace, getValues, setValue]);
  useEffect(() => {
    if (kind !== 'equipment' || !initialAsset || !assets.data) return;
    const asset = assets.data.assets.find(
      (entry) => entry.id === initialAsset && entry.status === 'in_use'
    );
    if (asset && getValues('lines').length === 1) {
      const line = getValues('lines')[0];
      if ('asset_id' in line && line.asset_id === initialAsset && !line.activated_at) {
        setValue('lines.0.activated_at', asset.activated_at ?? '');
        if (!getValues('returned_by')) setValue('returned_by', asset.custodian);
      }
    }
  }, [kind, initialAsset, assets.data, getValues, setValue]);
  const mutation = useMutation({
    mutationFn: async (values: InventoryReturnValues) => {
      const payload = JSON.stringify(values);
      if (retry.current?.payload !== payload) retry.current = { payload, id: crypto.randomUUID() };
      return saveInventoryReturn({ ...values, id: retry.current.id });
    },
    onSuccess: async () => {
      await Promise.all(
        [
          'inventory-returns',
          'inventory-return-source',
          'school-inventory',
          'inventory-assets',
          'notifications',
        ].map((key) => client.invalidateQueries({ queryKey: [key] }))
      );
      toast.success('รับคืนเรียบร้อยแล้ว');
      onSaved();
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ['inventory-return-source'] });
      void client.invalidateQueries({ queryKey: ['inventory-assets'] });
    },
  });
  const sources = [...(returns.data?.sources ?? [])];
  if (source.data && !sources.some((entry) => entry.id === source.data.source.id))
    sources.push(source.data.source);
  const sourceOptions = sources.map((entry) => ({
    ...entry,
    name: `ใบเบิก #${entry.document_number} · ${entry.recipient}`,
  }));
  const itemOptions = (inventory.data?.items ?? []).filter(
    (item) =>
      item.item_type === 'material' &&
      source.data?.lines.some((line) => line.item_id === item.id && line.quantity > 0)
  );
  const assetOptions = (assets.data?.assets ?? [])
    .filter((asset) => asset.status === 'in_use')
    .map((asset) => ({
      ...asset,
      name: `${asset.asset_code} · ${inventory.data?.items.find((item) => item.id === asset.item_id)?.name ?? ''} · ${asset.custodian}`,
    }));
  const error = inventory.error || assets.error || returns.error || source.error;
  return (
    <Form
      methods={methods}
      onSubmit={methods.handleSubmit((values) => {
        if (!mutation.isPending) mutation.mutate(values);
      })}
    >
      <Card sx={{ p: { xs: 2, sm: 3 }, display: 'grid', gap: 2.5 }}>
        <Alert severity="info">
          {kind === 'material'
            ? 'รับคืนเฉพาะวัสดุเหลือใช้ที่ยังใช้งานได้ ระบบเพิ่มสต็อกและหักยอดที่คืนได้จากใบเบิกเดิม'
            : 'คืนครุภัณฑ์ตามเลขทะเบียน ไม่เพิ่มจำนวนครุภัณฑ์รวม ชิ้นที่ชำรุดจะพักรอตรวจสอบและนำไปใช้งานไม่ได้'}
        </Alert>
        {error && <Alert severity="error">{error.message}</Alert>}
        <Field.Autocomplete
          name="kind"
          label="ประเภทการคืน"
          options={kindOptions}
          value={kindOptions.find((option) => option.id === kind)}
          disableClearable
          disabled={mutation.isPending}
          onChange={(_event, option) => {
            if (!option || option.id === kind) return;
            methods.reset(
              returnDefaults(
                option.id === 'equipment' ? 'equipment' : 'material',
                '',
                '',
                getValues('document_date')
              )
            );
          }}
        />
        {kind === 'material' && (
          <Field.Autocomplete
            name="source_document_id"
            label="ใบเบิกต้นทางที่อนุมัติแล้ว"
            required
            options={sourceOptions}
            value={sourceOptions.find((option) => option.id === sourceId) ?? null}
            loading={returns.isLoading || source.isFetching}
            disabled={mutation.isPending}
            helperText="เลือกจากใบเบิกล่าสุด 100 ใบ หรือเปิดรับคืนจากรายการใบเบิกต้นทาง"
            onChange={(_event, option) => {
              setValue('source_document_id', option?.id ?? '', {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue('returned_by', option?.recipient ?? '');
              replace([]);
            }}
          />
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Field.DatePicker
            name="document_date"
            label="วันที่รับคืน"
            required
            disabled={mutation.isPending}
            onChange={(value) =>
              setValue('document_date', value ? value.format('YYYY-MM-DD') : '', {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          <Field.Text name="returned_by" label="ผู้ส่งคืน" required disabled={mutation.isPending} />
        </Box>
        <Typography variant="subtitle1">รายการคืน ({fields.length}/100)</Typography>
        {fields.map((field, index) => {
          const line = lines[index];
          const itemId = line && 'item_id' in line ? line.item_id : '';
          const assetId = line && 'asset_id' in line ? line.asset_id : '';
          const max = source.data?.lines.find((entry) => entry.item_id === itemId)?.quantity;
          return (
            <Box
              key={field.id}
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) 230px auto' },
                alignItems: 'start',
              }}
            >
              {kind === 'material' ? (
                <>
                  <Field.Autocomplete
                    name={`lines.${index}.item_id`}
                    label="วัสดุ"
                    required
                    options={itemOptions}
                    value={itemOptions.find((item) => item.id === itemId) ?? null}
                    getOptionLabel={(item) => `${item.code} · ${item.name}`}
                    disabled={mutation.isPending || source.isFetching}
                    getOptionDisabled={(item) =>
                      lines.some(
                        (entry, other) =>
                          other !== index && 'item_id' in entry && entry.item_id === item.id
                      )
                    }
                    onChange={(_event, item) =>
                      setValue(`lines.${index}.item_id`, item?.id ?? '', {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                  <Field.Text
                    name={`lines.${index}.quantity`}
                    label="จำนวนคืน"
                    type="number"
                    required
                    disabled={mutation.isPending}
                    helperText={
                      max === undefined
                        ? ''
                        : `คืนได้ไม่เกิน ${max} ${itemOptions.find((item) => item.id === itemId)?.unit ?? ''}`
                    }
                    slotProps={{ htmlInput: { min: 1, max } }}
                  />
                </>
              ) : (
                <>
                  <Field.Autocomplete
                    name={`lines.${index}.asset_id`}
                    label="เลขทะเบียนครุภัณฑ์"
                    required
                    options={assetOptions}
                    value={assetOptions.find((asset) => asset.id === assetId) ?? null}
                    disabled={mutation.isPending}
                    getOptionDisabled={(asset) =>
                      lines.some(
                        (entry, other) =>
                          other !== index && 'asset_id' in entry && entry.asset_id === asset.id
                      )
                    }
                    onChange={(_event, asset) => {
                      setValue(`lines.${index}.asset_id`, asset?.id ?? '', { shouldDirty: true });
                      setValue(`lines.${index}.activated_at`, asset?.activated_at ?? '', {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      if (!getValues('returned_by') && asset)
                        setValue('returned_by', asset.custodian);
                    }}
                  />
                  <Field.Autocomplete
                    name={`lines.${index}.condition`}
                    label="สภาพที่รับคืน"
                    options={conditions}
                    disableClearable
                    value={
                      conditions.find(
                        (option) => line && 'condition' in line && option.id === line.condition
                      ) ?? conditions[0]
                    }
                    disabled={mutation.isPending}
                    onChange={(_event, option) =>
                      setValue(`lines.${index}.condition`, option.id, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                </>
              )}
              <Button color="error" disabled={mutation.isPending} onClick={() => remove(index)}>
                นำออก
              </Button>
            </Box>
          );
        })}
        {kind === 'material' &&
          source.data &&
          !source.data.lines.some((line) => line.quantity > 0) && (
            <Alert severity="warning">ใบเบิกนี้คืนครบแล้ว</Alert>
          )}
        <Button
          variant="outlined"
          disabled={
            mutation.isPending ||
            fields.length >= 100 ||
            (kind === 'material' && (!source.data || !itemOptions.length))
          }
          onClick={() =>
            append(
              kind === 'material'
                ? { item_id: '', quantity: 1 }
                : { asset_id: '', activated_at: '', condition: 'good' }
            )
          }
        >
          เพิ่มรายการคืน
        </Button>
        {methods.formState.errors.lines && (
          <Alert severity="error">กรุณาตรวจสอบรายการคืน ไม่ให้ซ้ำและระบุข้อมูลให้ครบถ้วน</Alert>
        )}
        <Field.Text
          name="note"
          label="เหตุผลการคืน / รายละเอียดสภาพ"
          required
          multiline
          minRows={3}
          disabled={mutation.isPending}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button color="inherit" disabled={mutation.isPending} onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={mutation.isPending}
            disabled={
              !!error ||
              inventory.isLoading ||
              assets.isLoading ||
              returns.isLoading ||
              source.isFetching ||
              !returns.data?.canManage ||
              !fields.length
            }
          >
            ยืนยันรับคืน
          </Button>
        </Box>
      </Card>
    </Form>
  );
}

function returnDefaults(
  kind: 'material' | 'equipment',
  source = '',
  asset = '',
  date?: string
): InventoryReturnValues {
  const common = {
    id: crypto.randomUUID(),
    document_date: date ?? new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10),
    returned_by: '',
    note: '',
  };
  return kind === 'material'
    ? {
        ...common,
        kind: 'material',
        source_document_id: source,
        lines: [{ item_id: '', quantity: 1 }],
      }
    : {
        ...common,
        kind: 'equipment',
        source_document_id: null,
        lines: [{ asset_id: asset, activated_at: '', condition: 'good' }],
      };
}
