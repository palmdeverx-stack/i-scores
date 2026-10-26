'use client';

import type { InventoryReturnValues } from './inventory-return-schema';

export type InventoryReturnRecord = {
  id: string;
  return_number: number;
  kind: 'material' | 'equipment';
  document_date: string;
  returned_by: string;
  note: string;
  source_document_id: string | null;
  created_at: string;
  lines: {
    item_id?: string;
    item_name?: string;
    code?: string;
    unit?: string;
    quantity?: number;
    asset_id?: string;
    asset_code?: string;
    custodian?: string;
    location?: string | null;
    condition?: 'good' | 'damaged';
  }[];
};
export type InventoryReturnSource = {
  id: string;
  document_number: number;
  recipient: string;
  lines: { item_id: string; quantity: number }[];
};
export async function loadInventoryReturns(): Promise<{
  returns: InventoryReturnRecord[];
  sources: InventoryReturnSource[];
  canManage: boolean;
}> {
  const response = await fetch('/api/inventory/returns', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}
export async function loadInventoryReturnSource(
  id: string
): Promise<{ source: InventoryReturnSource; lines: { item_id: string; quantity: number }[] }> {
  const response = await fetch(`/api/inventory/returns?source=${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}
export async function saveInventoryReturn(values: InventoryReturnValues) {
  const response = await fetch('/api/inventory/returns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}
