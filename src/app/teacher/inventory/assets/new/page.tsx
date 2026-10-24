import { InventoryAssetFormView } from 'src/sections/inventory/view/inventory-asset-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryAssetFormView />
    </DepartmentPermissionGuard>
  );
}
