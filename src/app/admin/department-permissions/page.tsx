import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { DepartmentPermissionsView } from 'src/sections/department-management/view/department-permissions-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `จัดการสิทธิ์เข้าใช้งาน - ${CONFIG.appName}` };

export default function Page() {
  return <DepartmentPermissionsView />;
}
