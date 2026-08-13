import type { Metadata } from 'next';

import { SubjectFormView } from 'src/sections/subject/view/subject-form-view';

import { DepartmentPermissionGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <DepartmentPermissionGuard permission="subjects.manage">
      <SubjectFormView subjectId={id} />
    </DepartmentPermissionGuard>
  );
}
