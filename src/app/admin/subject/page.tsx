import type { Metadata } from 'next';

import { SubjectListView } from 'src/sections/subject/view/subject-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="subjects.manage">
      <SubjectListView />
    </DepartmentPermissionGuard>
  );
}
