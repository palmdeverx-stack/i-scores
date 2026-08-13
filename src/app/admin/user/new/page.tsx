import type { Metadata } from 'next';

import { StaffCreateView } from 'src/sections/user/view/staff-create-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="staff.manage">
      <StaffCreateView />
    </DepartmentPermissionGuard>
  );
}
