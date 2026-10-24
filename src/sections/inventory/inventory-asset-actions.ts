'use client';

import type { InventoryAsset, InventoryAssetReceipt } from './types';
import type {
  InventoryAssetRegisterValues,
  InventoryAssetActivateValues,
} from './inventory-asset-schema';

export async function loadInventoryAssets(): Promise<{
  assets: InventoryAsset[];
  canManage: boolean;
}> {
  const r = await fetch('/api/inventory/assets', { cache: 'no-store' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d;
}
export async function loadInventoryAssetReceipts(itemId: string): Promise<InventoryAssetReceipt[]> {
  const r = await fetch(`/api/inventory/assets?itemId=${encodeURIComponent(itemId)}`, {
    cache: 'no-store',
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d.receipts.map((row: InventoryAssetReceipt) => ({
    ...row,
    registered_count: Number(row.registered_count),
  }));
}
async function save(body: unknown) {
  const r = await fetch('/api/inventory/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message);
  return d;
}
export async function registerInventoryAsset(input: InventoryAssetRegisterValues & { id: string }) {
  return save({ ...input, action: 'register' });
}
export async function activateInventoryAsset(input: InventoryAssetActivateValues & { id: string }) {
  return save({ ...input, action: 'activate' });
}
