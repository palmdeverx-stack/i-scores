import type { Metadata } from 'next';

import { TeacherDashboardView } from 'src/sections/teacher-dashboard/view/teacher-dashboard-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="dashboard.view">
      <TeacherDashboardView />
    </DepartmentPermissionGuard>
  );
}
