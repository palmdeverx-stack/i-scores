import type { Metadata } from 'next';

import { AttendanceScanStartView } from 'src/sections/attendance-scan/view/attendance-scan-start-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export const metadata: Metadata = {};

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="teaching.attendance">
      <AttendanceScanStartView />
    </DepartmentPermissionGuard>
  );
}
