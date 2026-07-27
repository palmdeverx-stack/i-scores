import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { DepartmentPermissionsView } from 'src/sections/department-management/view/department-permissions-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `สิทธิ์การใช้งาน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard>
      <DepartmentPermissionsView />
    </DepartmentPermissionGuard>
  );
}
