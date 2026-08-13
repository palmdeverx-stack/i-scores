import type { Metadata } from 'next';

import { UserListView } from 'src/sections/user/view/user-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="staff.manage">
      <UserListView />
    </DepartmentPermissionGuard>
  );
}
