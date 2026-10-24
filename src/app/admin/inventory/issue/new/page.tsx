import { InventoryMovementFormView } from 'src/sections/inventory/view/inventory-movement-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryMovementFormView kind="issue" />
    </DepartmentPermissionGuard>
  );
}
