import type { Metadata } from 'next';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="subjects.manage">
      <SubjectFormView />
    </DepartmentPermissionGuard>
  );
}
