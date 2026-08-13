import type { Metadata } from 'next';

import { TeacherDepartmentView } from 'src/sections/teacher-department/view/teacher-department-view';

import { DepartmentWorkspaceGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentWorkspaceGuard>
      <TeacherDepartmentView />
    </DepartmentWorkspaceGuard>
  );
}
