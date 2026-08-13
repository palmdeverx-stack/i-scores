import type { Metadata } from 'next';

import { StudentListView } from 'src/sections/user/view/student-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentListView view="pending" />
    </DepartmentPermissionGuard>
  );
}
