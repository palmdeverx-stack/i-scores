import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { DepartmentListView } from 'src/sections/department-management/view/department-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `จัดการฝ่าย - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard>
      <DepartmentListView />
    </DepartmentPermissionGuard>
  );
}
