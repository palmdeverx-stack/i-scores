import { InventoryMasterView } from 'src/sections/inventory/inventory-master-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryMasterView kind="unit" />
    </DepartmentPermissionGuard>
  );
}
