import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { StudentFormView } from 'src/sections/user/view/student-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `เพิ่มนักเรียน - ${CONFIG.appName}` };

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentFormView
        pendingConfirmation
        basePath={paths.admin.student.root}
        createReturnPath={paths.admin.student.importData}
      />
    </DepartmentPermissionGuard>
  );
}
