import { InventoryView } from 'src/sections/inventory/inventory-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryView mode="history" />
    </DepartmentPermissionGuard>
  );
}
