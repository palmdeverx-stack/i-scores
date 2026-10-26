import { paths } from 'src/routes/paths';

import { SubjectListView } from 'src/sections/subject/view/subject-list-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

export default function Page() {
  return (
    <DepartmentPermissionGuard permission="subjects.manage">
      <SubjectListView basePath={paths.teacher.departmentSubject} />
    </DepartmentPermissionGuard>
  );
}
