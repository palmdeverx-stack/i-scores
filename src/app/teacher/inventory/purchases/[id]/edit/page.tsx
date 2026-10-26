import { InventoryPurchaseFormView } from 'src/sections/inventory/view/inventory-purchase-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permission="inventory.manage" access="manage">
      <InventoryPurchaseFormView id={id} />
    </DepartmentPermissionGuard>
  );
}
