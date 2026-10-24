import { InventoryAssetListView } from 'src/sections/inventory/view/inventory-asset-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryAssetListView />
    </DepartmentPermissionGuard>
  );
}
