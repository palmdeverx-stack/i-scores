import { InventoryPurchaseListView } from 'src/sections/inventory/view/inventory-purchase-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryPurchaseListView />
    </DepartmentPermissionGuard>
  );
}
