import type { Metadata } from 'next';

import { DepartmentListView } from 'src/sections/department-management/view/department-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard>
      <DepartmentListView />
    </DepartmentPermissionGuard>
  );
}
