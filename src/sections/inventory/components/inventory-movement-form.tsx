'use client';

import type { Inventory } from '../types';
import type {
  InventoryMovementKind,
  InventoryDocumentFormValues,
} from '../inventory-movement-schema';

import { useRef, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { RemixIcon } from 'src/components/remix-icon';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import { inventoryStockStatus } from '../inventory-stock';
import { recordInventoryDocument } from '../inventory-actions';
import { InventoryFormSection } from './inventory-form-section';
import { createInventoryDocumentSchema } from '../inventory-movement-schema';
import { loadInventoryPurchases, loadInventoryPurchaseSource } from '../inventory-purchase-actions';

export function InventoryMovementForm({
  inventory,
  kind,
  initialItemId = '',
  initialPurchaseId = '',
  onCancel,
  onSaved,
}: {
  inventory: Inventory;
  kind: InventoryMovementKind;
  initialItemId?: string;
  initialPurchaseId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthContext();
  const purchasesQuery = useQuery({
    queryKey: ['inventory-purchases', user?.school_id, user?.id],
    queryFn: loadInventoryPurchases,
    enabled: kind === 'receive' && Boolean(user?.school_id),
  });
  const [today] = useState(() => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10));
  const queryClient = useQueryClient();
  const retry = useRef<{ payload: string; id: string } | null>(null);
  const [sourceLines, setSourceLines] = useState<{ item_id: string; quantity: number }[] | null>(
    null
  );
  const methods = useForm<InventoryDocumentFormValues>({
    resolver: zodResolver(
      createInventoryDocumentSchema(kind, inventory.items).superRefine((values, ctx) => {
        if (kind === 'receive' && values.source_purchase_id) {
          if (!sourceLines)
            ctx.addIssue({
              code: 'custom',
              path: ['source_purchase_id'],
              message: 'กรุณาโหลดใบสั่งซื้อให้เรียบร้อย',
            });
          values.lines.forEach((line, index) => {
            const source = sourceLines?.find((entry) => entry.item_id === line.item_id);
            if (!source || line.quantity > source.quantity)
              ctx.addIssue({
                code: 'custom',
                path: ['lines', index, 'quantity'],
                message: `รับได้ไม่เกิน ${source?.quantity ?? 0} ตามใบสั่งซื้อ`,
              });
          });
        }
      })
    ),
    mode: 'onBlur',
    defaultValues: {
      lines: [
        {
          item_id: inventory.items.some((item) => item.id === initialItemId) ? initialItemId : '',
          quantity: 1,
        },
      ],
      source_purchase_id: initialPurchaseId || null,
      reference_number: '',
      document_date: today,
      recipient: '',
      note: '',
    },
  });
  const { control, handleSubmit } = methods;
  const sourceId = useWatch({ control, name: 'source_purchase_id' });
  const selectedPurchase = purchasesQuery.data?.purchases.find(
    (purchase) => purchase.id === sourceId
  );
  const { setValue, getValues } = methods;
  useEffect(() => {
    if (selectedPurchase?.supplier && !getValues('recipient'))
      setValue('recipient', selectedPurchase.supplier);
  }, [selectedPurchase?.supplier, setValue, getValues]);
  const sourceMutation = useMutation({
    mutationFn: loadInventoryPurchaseSource,
    onSuccess: (data, id) => {
      if (methods.getValues('source_purchase_id') !== id) return;
      setSourceLines(data);
      const remaining = data.filter((line) => line.quantity > 0);
      replace(remaining.length ? remaining : [{ item_id: '', quantity: 1 }]);
    },
    onError: (_error, id) => {
      if (methods.getValues('source_purchase_id') === id) setSourceLines(null);
    },
  });
  const { mutate: loadSource } = sourceMutation;
  useEffect(() => {
    if (initialPurchaseId && kind === 'receive') loadSource(initialPurchaseId);
  }, [initialPurchaseId, kind, loadSource]);
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'lines' });
  const lines = useWatch({ control, name: 'lines' });
  const mutation = useMutation({
    mutationFn: async (values: InventoryDocumentFormValues) => {
      const payload = JSON.stringify({ kind, ...values });
      if (retry.current?.payload !== payload) retry.current = { payload, id: crypto.randomUUID() };
      await recordInventoryDocument({
        ...values,
        document_date: values.document_date || undefined,
        kind,
        id: retry.current.id,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['school-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-purchases'] }),
      ]);
      onSaved();
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: ['school-inventory'] });
    },
  });
  const label = kind === 'receive' ? 'รับเข้าพัสดุ' : 'ขอเบิกพัสดุ';
  return (
    <Form
      methods={methods}
      onSubmit={handleSubmit((values) => {
        if (!mutation.isPending) mutation.mutate(values);
      })}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'start',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
          }}
        >
          <Card variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
            <InventoryFormSection
              number="1"
              title={`รายละเอียด${label}`}
              description="เลือกพัสดุและระบุจำนวน พร้อมข้อมูลผู้เกี่ยวข้องเพื่อเก็บประวัติ"
              icon="solar:box-bold-duotone"
            />
            <Box sx={{ mt: 3, display: 'grid', gap: 2.5 }}>
              {kind === 'receive' && (
                <>
                  <Field.Select
                    name="source_purchase_id"
                    label="รับเข้าตามใบสั่งซื้อ (ถ้ามี)"
                    value={sourceId ?? ''}
                    disabled={mutation.isPending}
                    onChange={(event) => {
                      const id = event.target.value;
                      methods.setValue('source_purchase_id', id || null, { shouldDirty: true });
                      setSourceLines(null);
                      sourceMutation.reset();
                      if (id) {
                        methods.setValue(
                          'recipient',
                          purchasesQuery.data?.purchases.find((purchase) => purchase.id === id)
                            ?.supplier ?? ''
                        );
                        sourceMutation.mutate(id);
                      } else replace([{ item_id: '', quantity: 1 }]);
                    }}
                  >
                    <MenuItem value="">รับเข้าโดยไม่อ้างอิงใบสั่งซื้อ</MenuItem>
                    {sourceId && !selectedPurchase && (
                      <MenuItem value={sourceId}>ใบสั่งซื้อที่เลือกจากหน้าจัดซื้อ</MenuItem>
                    )}
                    {(purchasesQuery.data?.purchases ?? [])
                      .filter((doc) => ['ordered', 'partially_received'].includes(doc.status))
                      .map((doc) => (
                        <MenuItem key={doc.id} value={doc.id}>
                          PO {doc.order_number} · {doc.title} · {doc.lines.length} รายการ
                        </MenuItem>
                      ))}
                  </Field.Select>
                  {purchasesQuery.error && (
                    <Alert
                      severity="error"
                      action={<Button onClick={() => purchasesQuery.refetch()}>ลองใหม่</Button>}
                    >
                      {purchasesQuery.error.message}
                    </Alert>
                  )}
                  {selectedPurchase && (
                    <Alert
                      severity="info"
                      action={
                        selectedPurchase.attachment_path ? (
                          <Button
                            component="a"
                            href={`/api/inventory/purchases/${selectedPurchase.id}/attachment`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            เปิดใบสั่งซื้อ
                          </Button>
                        ) : undefined
                      }
                    >
                      ใบสั่งซื้อ {selectedPurchase.order_number} · {selectedPurchase.supplier}
                    </Alert>
                  )}
                  {sourceMutation.isPending && (
                    <Alert severity="info">กำลังโหลดรายการค้างรับจากใบสั่งซื้อ…</Alert>
                  )}
                  {sourceMutation.error && (
                    <Alert
                      severity="error"
                      action={
                        <Button onClick={() => sourceId && sourceMutation.mutate(sourceId)}>
                          ลองใหม่
                        </Button>
                      }
                    >
                      {sourceMutation.error.message}
                    </Alert>
                  )}
                  {sourceId && sourceLines && !sourceLines.some((line) => line.quantity > 0) && (
                    <Alert severity="warning">ใบนี้รับเข้าครบแล้ว กรุณาเลือกใบอื่น</Alert>
                  )}
                  {sourceId && sourceLines && (
                    <Alert severity="info">
                      ดึงเฉพาะจำนวนค้างรับแล้ว สามารถรับบางรายการได้ โดยไม่เกินยอดที่ขอ
                      ระบบจะปรับสถานะใบสั่งซื้อเป็นรับบางส่วนหรือรับครบโดยอัตโนมัติ
                    </Alert>
                  )}
                </>
              )}
              <Field.Text
                name="reference_number"
                label={
                  kind === 'receive'
                    ? 'เลขที่เอกสารรับเข้า / ใบส่งของ'
                    : 'เลขที่เอกสารอ้างอิง (ถ้ามี)'
                }
                required={kind === 'receive'}
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              <Field.Text
                name="document_date"
                label="วันที่เอกสาร"
                type="date"
                required={kind === 'receive'}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="subtitle1">
                  รายการพัสดุ{' '}
                  <Typography component="span" variant="body2" color="text.secondary">
                    ({fields.length}/100)
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  เลือกพัสดุ แล้วระบุจำนวน
                </Typography>
              </Box>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                }}
              >
                {fields.map((field, index) => {
                  const selected = inventory.items.find(
                    (item) => item.id === lines[index]?.item_id
                  );
                  const status = selected ? inventoryStockStatus(selected) : null;
                  return (
                    <Box
                      key={field.id}
                      sx={{
                        display: 'grid',
                        gap: 1.5,
                        alignItems: 'start',
                        p: { xs: 1.5, sm: 2 },
                        gridTemplateColumns: {
                          xs: '24px minmax(0,1fr) 32px',
                          sm: '24px minmax(0,1fr) 112px 32px',
                        },
                        borderBottom: index < fields.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        '&:focus-within': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          mt: 1,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 0.75,
                          bgcolor: 'background.neutral',
                          color: 'text.secondary',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Field.Select
                          name={`lines.${index}.item_id`}
                          label="พัสดุ"
                          size="small"
                          required
                          disabled={mutation.isPending}
                          sx={{
                            '& .MuiSelect-select': {
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                          }}
                        >
                          <MenuItem value="">เลือกพัสดุ</MenuItem>
                          {inventory.items
                            .filter((item) => kind === 'receive' || item.item_type !== 'equipment')
                            .filter(
                              (item) =>
                                !sourceId ||
                                sourceLines?.some(
                                  (entry) => entry.item_id === item.id && entry.quantity > 0
                                )
                            )
                            .map((item) => (
                              <MenuItem
                                key={item.id}
                                value={item.id}
                                disabled={lines.some(
                                  (line, other) => other !== index && line.item_id === item.id
                                )}
                              >
                                {item.code} · {item.name}
                              </MenuItem>
                            ))}
                        </Field.Select>
                        {selected && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              mt: 0.75,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Chip
                              size="small"
                              color={status!.color}
                              variant="soft"
                              label={status!.label}
                              sx={{ height: 20, fontSize: 11 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              คงเหลือ{' '}
                              <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                {selected.quantity} {selected.unit}
                              </Box>
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              · {selected.location || 'ยังไม่ระบุที่จัดเก็บ'}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Box
                        sx={{ gridColumn: { xs: '2', sm: 'auto' }, gridRow: { xs: 2, sm: 'auto' } }}
                      >
                        <Field.Text
                          name={`lines.${index}.quantity`}
                          label="จำนวน"
                          size="small"
                          type="number"
                          required
                          disabled={mutation.isPending}
                          helperText={selected?.unit}
                          slotProps={{
                            htmlInput: {
                              'aria-label': `จำนวนรายการที่ ${index + 1}`,
                              style: { textAlign: 'right' },
                            },
                          }}
                        />
                      </Box>
                      <Tooltip
                        title={fields.length === 1 ? 'ต้องมีอย่างน้อย 1 รายการ' : 'นำรายการออก'}
                      >
                        <Box
                          component="span"
                          sx={{ gridColumn: { xs: 3, sm: 4 }, gridRow: 1, mt: 0.5 }}
                        >
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`นำรายการที่ ${index + 1} ออก`}
                            disabled={fields.length === 1 || mutation.isPending}
                            onClick={() => remove(index)}
                          >
                            <RemixIcon icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
              {methods.formState.errors.lines?.root?.message && (
                <Alert severity="error">{methods.formState.errors.lines.root.message}</Alert>
              )}
              <Button
                variant="outlined"
                startIcon={<RemixIcon icon="mingcute:add-line" width={18} />}
                sx={{ borderStyle: 'dashed', py: 1 }}
                disabled={fields.length >= 100 || mutation.isPending}
                onClick={() => append({ item_id: '', quantity: 1 })}
              >
                เพิ่มรายการพัสดุ
              </Button>
              <Field.Text
                name="recipient"
                label={kind === 'issue' ? 'ผู้เบิก / ผู้รับพัสดุ' : 'ผู้ส่งมอบ / แหล่งที่มา'}
                required={kind === 'issue'}
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              <Field.Text
                name="note"
                label="วัตถุประสงค์ / เลขที่เอกสาร / หมายเหตุ"
                multiline
                minRows={4}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
            </Box>
          </Card>
          <Card variant="outlined" sx={{ p: 3, position: { lg: 'sticky' }, top: 88 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              สรุปรายการ
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              หนึ่งใบ · {fields.length} รายการ
            </Typography>
            {lines.map((line, index) => {
              const selected = inventory.items.find((item) => item.id === line.item_id);
              return selected ? (
                <Box
                  key={fields[index]?.id ?? index}
                  sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Typography variant="subtitle2">
                    {index + 1}. {selected.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    คงเหลือ {selected.quantity} {selected.unit}
                  </Typography>
                  {Number.isInteger(line.quantity) && line.quantity > 0 && (
                    <Typography
                      variant="body2"
                      color={
                        kind === 'issue' && line.quantity > selected.quantity
                          ? 'error'
                          : 'text.primary'
                      }
                    >
                      {kind === 'issue' ? 'หลังอนุมัติ (ประมาณ)' : 'หลังรับเข้า'}{' '}
                      {selected.quantity + (kind === 'receive' ? line.quantity : -line.quantity)}{' '}
                      {selected.unit}
                    </Typography>
                  )}
                </Box>
              ) : null;
            })}
            <Alert severity="info" variant="outlined" sx={{ mt: 2.5 }}>
              {kind === 'issue'
                ? 'ส่งใบขอเบิกเพื่ออนุมัติ ยังไม่ตัดสต็อกจนกว่าจะอนุมัติ และไม่สำรองยอดระหว่างรอ'
                : 'รับเข้าตามเอกสาร โดยเพิ่มสต็อกทุกรายการพร้อมกัน'}
              และเก็บประวัติผู้ทำรายการ
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
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              ตรวจสอบรายการและจำนวนก่อนยืนยัน
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="large" color="inherit" disabled={mutation.isPending} onClick={onCancel}>
                ยกเลิก
              </Button>
              <Button
                type="submit"
                size="large"
                variant="contained"
                loading={mutation.isPending}
                disabled={
                  sourceMutation.isPending ||
                  Boolean(
                    sourceId && (!sourceLines || !sourceLines.some((line) => line.quantity > 0))
                  )
                }
              >
                {kind === 'issue' ? 'ส่งขออนุมัติ' : 'บันทึกรับเข้า'}
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>
    </Form>
  );
}
