import { paths } from 'src/routes/paths';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="subjects.manage" access="manage">
      <SubjectFormView basePath={paths.teacher.departmentSubject} />
    </DepartmentPermissionGuard>
  );
}
