import { InventoryPurchaseDetailView } from 'src/sections/inventory/view/inventory-purchase-detail-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permissions={['inventory.manage', 'inventory.approve']}>
      <InventoryPurchaseDetailView id={id} />
    </DepartmentPermissionGuard>
  );
}
