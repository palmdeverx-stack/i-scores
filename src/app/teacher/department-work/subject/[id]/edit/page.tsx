import { paths } from 'src/routes/paths';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <DepartmentPermissionGuard permission="subjects.manage" access="manage">
      <SubjectFormView subjectId={id} basePath={paths.teacher.departmentSubject} />
    </DepartmentPermissionGuard>
  );
}
