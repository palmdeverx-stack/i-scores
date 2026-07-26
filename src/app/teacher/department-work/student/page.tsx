import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { StudentListView } from 'src/sections/user/view/student-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `นักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentListView />
    </DepartmentPermissionGuard>
  );
}
