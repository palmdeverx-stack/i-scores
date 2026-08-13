import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { StudentFormView } from 'src/sections/user/view/student-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentFormView basePath={paths.teacher.departmentStudent} />
    </DepartmentPermissionGuard>
  );
}
