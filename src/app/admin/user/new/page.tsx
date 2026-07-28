import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StaffCreateView } from 'src/sections/user/view/staff-create-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มครู/บุคลากร - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="staff.manage">
      <StaffCreateView />
    </DepartmentPermissionGuard>
  );
}
