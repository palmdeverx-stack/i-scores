import type { Metadata } from 'next';

import { DepartmentPermissionsView } from 'src/sections/department-management/view/department-permissions-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard>
      <DepartmentPermissionsView />
    </DepartmentPermissionGuard>
  );
}
