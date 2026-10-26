import { StaffCreateView } from 'src/sections/user/view/staff-create-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="staff.manage" access="manage">
      <StaffCreateView />
    </DepartmentPermissionGuard>
  );
}
