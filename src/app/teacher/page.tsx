import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { TeacherDashboardView } from 'src/sections/teacher-dashboard/view/teacher-dashboard-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `แดชบอร์ดครู - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="dashboard.view">
      <TeacherDashboardView />
    </DepartmentPermissionGuard>
  );
}
