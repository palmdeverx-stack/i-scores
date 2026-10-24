import { InventoryDocumentListView } from 'src/sections/inventory/view/inventory-document-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="inventory.manage">
      <InventoryDocumentListView kind="issue" />
    </DepartmentPermissionGuard>
  );
}
