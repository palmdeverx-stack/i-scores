import { InventoryPurchaseFormView } from 'src/sections/inventory/view/inventory-purchase-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryPurchaseFormView />
    </DepartmentPermissionGuard>
  );
}
