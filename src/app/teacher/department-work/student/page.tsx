import type { Metadata } from 'next';

import { paths } from 'src/routes/paths';

import { StudentListView } from 'src/sections/user/view/student-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="students.manage">
      <StudentListView basePath={paths.teacher.departmentStudent} />
    </DepartmentPermissionGuard>
  );
}
