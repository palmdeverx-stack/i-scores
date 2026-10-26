import { InventoryReturnListView } from 'src/sections/inventory/view/inventory-return-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryReturnListView />
    </DepartmentPermissionGuard>
  );
}
