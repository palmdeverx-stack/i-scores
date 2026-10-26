import { InventoryReturnFormView } from 'src/sections/inventory/view/inventory-return-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage" access="manage">
      <InventoryReturnFormView />
    </DepartmentPermissionGuard>
  );
}
