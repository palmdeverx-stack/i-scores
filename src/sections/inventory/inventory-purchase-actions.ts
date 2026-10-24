'use client';

import type { InventoryPurchaseData, InventoryPurchaseDetail } from './types';
import type {
  PurchaseOrderValues,
  PurchaseReviewValues,
  PurchaseRequestValues,
} from './inventory-purchase-schema';

async function purchaseRequest(body?: unknown) {
  const response = await fetch(
    '/api/inventory/purchases',
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store' }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'ทำรายการจัดซื้อไม่สำเร็จ');
  return data;
}
export async function loadInventoryPurchases(): Promise<InventoryPurchaseData> {
  return purchaseRequest();
}
export async function createInventoryPurchase(
  input: PurchaseRequestValues & { id: string },
  draft = false
) {
  return purchaseRequest({ ...input, action: draft ? 'draft' : 'create' });
}
export async function reviewInventoryPurchase(input: PurchaseReviewValues & { id: string }) {
  return purchaseRequest({ ...input, action: 'review' });
}
export async function orderInventoryPurchase(
  input: PurchaseOrderValues & { id: string },
  file: File | null
) {
  if (file) {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`/api/inventory/purchases/${input.id}/attachment`, {
      method: 'POST',
      body: form,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'แนบใบสั่งซื้อไม่สำเร็จ');
  }
  return purchaseRequest({ ...input, action: 'order' });
}
export async function loadInventoryPurchaseSource(
  id: string
): Promise<{ item_id: string; quantity: number }[]> {
  const response = await fetch(`/api/inventory?purchase_source=${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'โหลดรายการค้างรับไม่สำเร็จ');
  return data.lines.map((line: { item_id: string; quantity: number | string }) => ({
    ...line,
    quantity: Number(line.quantity),
  }));
}

export async function loadInventoryPurchaseDetail(id: string): Promise<InventoryPurchaseDetail> {
  const response = await fetch(`/api/inventory/purchases/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'โหลดเอกสารจัดซื้อไม่สำเร็จ');
  return data;
}
