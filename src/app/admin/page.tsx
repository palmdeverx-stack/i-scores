import type { Metadata } from 'next';

import { AdminDashboardView } from 'src/sections/admin-dashboard/view/admin-dashboard-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="dashboard.view">
      <AdminDashboardView />
    </DepartmentPermissionGuard>
  );
}
