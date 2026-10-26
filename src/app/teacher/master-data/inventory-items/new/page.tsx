import { InventoryFormView } from 'src/sections/inventory/view/inventory-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage" access="manage">
      <InventoryFormView />
    </DepartmentPermissionGuard>
  );
}
