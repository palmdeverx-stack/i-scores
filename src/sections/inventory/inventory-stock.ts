export function inventoryStockStatus(item: {
  quantity: number;
  minimum_stock: number;
  maximum_stock: number;
}) {
  if (item.quantity === 0) return { key: 'out', label: 'หมดคลัง', color: 'error' as const };
  if (item.quantity <= item.minimum_stock)
    return { key: 'low', label: 'ใกล้หมด', color: 'warning' as const };
  if (item.maximum_stock > 0 && item.quantity > item.maximum_stock)
    return { key: 'over', label: 'เกิน MAX', color: 'info' as const };
  return { key: 'normal', label: 'พร้อมใช้', color: 'success' as const };
}
export function inventoryReplenishment(item: { quantity: number; maximum_stock: number }) {
  return item.maximum_stock > 0 ? Math.max(0, item.maximum_stock - item.quantity) : null;
}
