'use client';

import type { Inventory } from './types';

export async function loadInventory(): Promise<Inventory> {
  const response = await fetch('/api/inventory', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'โหลดข้อมูลไม่สำเร็จ');
  return data;
}
export async function saveInventory(body: unknown) {
  const response = await fetch('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'บันทึกไม่สำเร็จ');
  return data;
}

export async function saveInventoryImage(id: string, file: File | null) {
  const form = new FormData();
  if (file) form.append('file', file);
  const response = await fetch(`/api/inventory/${id}/image`, {
    method: file ? 'POST' : 'DELETE',
    ...(file && { body: form }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message ?? 'บันทึกรูปไม่สำเร็จ');
}

export async function recordInventoryMovement(input: {
  id: string;
  item_id: string;
  kind: 'receive' | 'issue';
  quantity: number;
  recipient: string;
  note: string;
}): Promise<void> {
  await saveInventory({ ...input, action: 'movement' });
}

export async function recordInventoryDocument(input: {
  source_request_id?: string | null;
  source_purchase_id?: string | null;
  id: string;
  kind: 'receive' | 'issue';
  reference_number?: string;
  document_date?: string;
  recipient: string;
  note: string;
  lines: { item_id: string; quantity: number }[];
}): Promise<void> {
  await saveInventory({ ...input, action: 'movement_document' });
}

export async function reviewInventoryDocument(input: {
  id: string;
  approve: boolean;
  note: string;
}) {
  await saveInventory({ ...input, action: 'review_document' });
}

export async function loadInventoryRequestSource(
  id: string
): Promise<{ item_id: string; quantity: number }[]> {
  const response = await fetch(`/api/inventory?request_source=${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'โหลดใบขอเบิกไม่สำเร็จ');
  return data.lines.map((line: { item_id: string; quantity: number | string }) => ({
    ...line,
    quantity: Number(line.quantity),
  }));
}
